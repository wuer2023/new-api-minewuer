package controller

import (
	"net/http"
	"sort"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type homeStatusSummary struct {
	TotalCount     int     `json:"total_count"`
	TotalTokenUsed int     `json:"total_token_used"`
	ActiveModels   int     `json:"active_models"`
	AvgRPM         float64 `json:"avg_rpm"`
	AvgTPM         float64 `json:"avg_tpm"`
	PeakHourCount  int     `json:"peak_hour_count"`
}

type homeStatusTrendPoint struct {
	Time      string `json:"time"`
	Count     int    `json:"count"`
	TokenUsed int    `json:"token_used"`
}

type homeStatusRankingItem struct {
	ModelName string `json:"model_name"`
	Count     int    `json:"count"`
	TokenUsed int    `json:"token_used"`
}

type homeStatusUserRankingItem struct {
	Username  string `json:"username"`
	Count     int    `json:"count"`
	TokenUsed int    `json:"token_used"`
}

type homeStatusResponse struct {
	Enabled        bool                        `json:"enabled"`
	Summary24h     homeStatusSummary           `json:"summary_24h"`
	Trend24h       []homeStatusTrendPoint      `json:"trend_24h"`
	Trend7d        []homeStatusTrendPoint      `json:"trend_7d"`
	Ranking24h     []homeStatusRankingItem     `json:"ranking_24h"`
	Ranking7d      []homeStatusRankingItem     `json:"ranking_7d"`
	UserRanking24h []homeStatusUserRankingItem `json:"user_ranking_24h"`
	UserRanking7d  []homeStatusUserRankingItem `json:"user_ranking_7d"`
	UpdatedAt      int64                       `json:"updated_at"`
}

var homeStatusCache struct {
	sync.RWMutex
	data      homeStatusResponse
	expiresAt time.Time
}

func GetHomeStatus(c *gin.Context) {
	if !common.DataExportEnabled {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "",
			"data": homeStatusResponse{
				Enabled: false,
			},
		})
		return
	}

	now := time.Now()
	homeStatusCache.RLock()
	if now.Before(homeStatusCache.expiresAt) {
		cached := homeStatusCache.data
		homeStatusCache.RUnlock()
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "",
			"data":    cached,
		})
		return
	}
	homeStatusCache.RUnlock()

	endTime := now.Unix()
	startTime7d := now.Add(-7 * 24 * time.Hour).Unix()
	data, err := model.GetAllQuotaDateRecords(startTime7d, endTime)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	startTime24h := now.Add(-24 * time.Hour).Unix()
	trend24h := make(map[int64]*homeStatusTrendPoint)
	trend7d := make(map[string]*homeStatusTrendPoint)
	rankings24h := make(map[string]*homeStatusRankingItem)
	rankings7d := make(map[string]*homeStatusRankingItem)
	userRankings24h := make(map[string]*homeStatusUserRankingItem)
	userRankings7d := make(map[string]*homeStatusUserRankingItem)
	activeModels24h := make(map[string]struct{})

	for i := 0; i < 24; i++ {
		timestamp := now.Add(time.Duration(i-23) * time.Hour).Unix()
		timestamp = timestamp - (timestamp % 3600)
		trend24h[timestamp] = &homeStatusTrendPoint{
			Time: time.Unix(timestamp, 0).Format("01-02 15:00"),
		}
	}

	for i := 0; i < 7; i++ {
		date := now.AddDate(0, 0, i-6)
		dateStr := date.Format("2006-01-02")
		trend7d[dateStr] = &homeStatusTrendPoint{
			Time: dateStr,
		}
	}

	summary24h := homeStatusSummary{}
	for _, item := range data {
		username := item.Username
		if username == "" {
			username = "匿名用户"
		}

		ranking7d := rankings7d[item.ModelName]
		if ranking7d == nil {
			ranking7d = &homeStatusRankingItem{ModelName: item.ModelName}
			rankings7d[item.ModelName] = ranking7d
		}
		ranking7d.Count += item.Count
		ranking7d.TokenUsed += item.TokenUsed

		userRanking7d := userRankings7d[username]
		if userRanking7d == nil {
			userRanking7d = &homeStatusUserRankingItem{Username: username}
			userRankings7d[username] = userRanking7d
		}
		userRanking7d.Count += item.Count
		userRanking7d.TokenUsed += item.TokenUsed

		dateStr := time.Unix(item.CreatedAt, 0).Format("2006-01-02")
		if point, ok := trend7d[dateStr]; ok {
			point.Count += item.Count
			point.TokenUsed += item.TokenUsed
		}

		if item.CreatedAt < startTime24h {
			continue
		}

		summary24h.TotalCount += item.Count
		summary24h.TotalTokenUsed += item.TokenUsed
		activeModels24h[item.ModelName] = struct{}{}

		point := trend24h[item.CreatedAt]
		if point == nil {
			point = &homeStatusTrendPoint{
				Time: time.Unix(item.CreatedAt, 0).Format("01-02 15:00"),
			}
			trend24h[item.CreatedAt] = point
		}
		point.Count += item.Count
		point.TokenUsed += item.TokenUsed
		if point.Count > summary24h.PeakHourCount {
			summary24h.PeakHourCount = point.Count
		}

		ranking24h := rankings24h[item.ModelName]
		if ranking24h == nil {
			ranking24h = &homeStatusRankingItem{ModelName: item.ModelName}
			rankings24h[item.ModelName] = ranking24h
		}
		ranking24h.Count += item.Count
		ranking24h.TokenUsed += item.TokenUsed

		userRanking24h := userRankings24h[username]
		if userRanking24h == nil {
			userRanking24h = &homeStatusUserRankingItem{Username: username}
			userRankings24h[username] = userRanking24h
		}
		userRanking24h.Count += item.Count
		userRanking24h.TokenUsed += item.TokenUsed
	}

	summary24h.ActiveModels = len(activeModels24h)
	summary24h.AvgRPM = float64(summary24h.TotalCount) / (24 * 60)
	summary24h.AvgTPM = float64(summary24h.TotalTokenUsed) / (24 * 60)

	trend24hList := make([]homeStatusTrendPoint, 0, len(trend24h))
	trendKeys := make([]int64, 0, len(trend24h))
	for timestamp := range trend24h {
		trendKeys = append(trendKeys, timestamp)
	}
	sort.Slice(trendKeys, func(i, j int) bool {
		return trendKeys[i] < trendKeys[j]
	})
	for _, timestamp := range trendKeys {
		trend24hList = append(trend24hList, *trend24h[timestamp])
	}

	trend7dList := make([]homeStatusTrendPoint, 0, len(trend7d))
	trend7dKeys := make([]string, 0, len(trend7d))
	for dateStr := range trend7d {
		trend7dKeys = append(trend7dKeys, dateStr)
	}
	sort.Strings(trend7dKeys)
	for _, dateStr := range trend7dKeys {
		trend7dList = append(trend7dList, *trend7d[dateStr])
	}

	ranking24hList := make([]homeStatusRankingItem, 0, len(rankings24h))
	for _, item := range rankings24h {
		ranking24hList = append(ranking24hList, *item)
	}
	sort.Slice(ranking24hList, func(i, j int) bool {
		if ranking24hList[i].Count == ranking24hList[j].Count {
			return ranking24hList[i].TokenUsed > ranking24hList[j].TokenUsed
		}
		return ranking24hList[i].Count > ranking24hList[j].Count
	})
	if len(ranking24hList) > 10 {
		ranking24hList = ranking24hList[:10]
	}

	ranking7dList := make([]homeStatusRankingItem, 0, len(rankings7d))
	for _, item := range rankings7d {
		ranking7dList = append(ranking7dList, *item)
	}
	sort.Slice(ranking7dList, func(i, j int) bool {
		if ranking7dList[i].Count == ranking7dList[j].Count {
			return ranking7dList[i].TokenUsed > ranking7dList[j].TokenUsed
		}
		return ranking7dList[i].Count > ranking7dList[j].Count
	})
	if len(ranking7dList) > 10 {
		ranking7dList = ranking7dList[:10]
	}

	userRanking24hList := make([]homeStatusUserRankingItem, 0, len(userRankings24h))
	for _, item := range userRankings24h {
		userRanking24hList = append(userRanking24hList, *item)
	}
	sort.Slice(userRanking24hList, func(i, j int) bool {
		if userRanking24hList[i].Count == userRanking24hList[j].Count {
			return userRanking24hList[i].TokenUsed > userRanking24hList[j].TokenUsed
		}
		return userRanking24hList[i].Count > userRanking24hList[j].Count
	})
	if len(userRanking24hList) > 10 {
		userRanking24hList = userRanking24hList[:10]
	}

	userRanking7dList := make([]homeStatusUserRankingItem, 0, len(userRankings7d))
	for _, item := range userRankings7d {
		userRanking7dList = append(userRanking7dList, *item)
	}
	sort.Slice(userRanking7dList, func(i, j int) bool {
		if userRanking7dList[i].Count == userRanking7dList[j].Count {
			return userRanking7dList[i].TokenUsed > userRanking7dList[j].TokenUsed
		}
		return userRanking7dList[i].Count > userRanking7dList[j].Count
	})
	if len(userRanking7dList) > 10 {
		userRanking7dList = userRanking7dList[:10]
	}

	response := homeStatusResponse{
		Enabled:        true,
		Summary24h:     summary24h,
		Trend24h:       trend24hList,
		Trend7d:        trend7dList,
		Ranking24h:     ranking24hList,
		Ranking7d:      ranking7dList,
		UserRanking24h: userRanking24hList,
		UserRanking7d:  userRanking7dList,
		UpdatedAt:      now.Unix(),
	}

	homeStatusCache.Lock()
	homeStatusCache.data = response
	homeStatusCache.expiresAt = now.Add(time.Minute)
	homeStatusCache.Unlock()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    response,
	})
}
