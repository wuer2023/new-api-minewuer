package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/common/limiter"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/setting"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

const (
	ModelRequestRateLimitCountMark        = "MRRL"
	ModelRequestRateLimitSuccessCountMark = "MRRLS"
)

var (
	modelRequestMemoryRateLimiterOnce sync.Once
)

func getRateLimitSubject(c *gin.Context) string {
	channelID := common.GetContextKeyInt(c, constant.ContextKeyChannelId)
	modelName := common.GetContextKeyString(c, constant.ContextKeyOriginalModel)
	if channelID > 0 {
		if modelName != "" {
			return fmt.Sprintf("u:%d:c:%d:m:%s", c.GetInt("id"), channelID, modelName)
		}
		return fmt.Sprintf("u:%d:c:%d", c.GetInt("id"), channelID)
	}
	if modelName != "" {
		return fmt.Sprintf("u:%d:m:%s", c.GetInt("id"), modelName)
	}
	return strconv.Itoa(c.GetInt("id"))
}

func getEffectiveRateLimit(c *gin.Context) (int, int) {
	totalMaxCount := setting.ModelRequestRateLimitCount
	successMaxCount := setting.ModelRequestRateLimitSuccessCount

	group := common.GetContextKeyString(c, constant.ContextKeyTokenGroup)
	if group == "" {
		group = common.GetContextKeyString(c, constant.ContextKeyUserGroup)
	}

	if groupTotalCount, groupSuccessCount, found := setting.GetGroupRateLimit(group); found {
		totalMaxCount = groupTotalCount
		successMaxCount = groupSuccessCount
	}

	channelID := common.GetContextKeyInt(c, constant.ContextKeyChannelId)
	if channelID > 0 {
		if channelTotalCount, channelSuccessCount, found := setting.GetChannelRateLimit(strconv.Itoa(channelID)); found {
			totalMaxCount = channelTotalCount
			successMaxCount = channelSuccessCount
		}
	}

	modelName := common.GetContextKeyString(c, constant.ContextKeyOriginalModel)
	if modelName != "" {
		if modelTotalCount, modelSuccessCount, found := setting.GetModelRateLimit(modelName); found {
			totalMaxCount = modelTotalCount
			successMaxCount = modelSuccessCount
		}
	}

	return totalMaxCount, successMaxCount
}

func checkRedisRateLimit(ctx context.Context, rdb *redis.Client, key string, maxCount int, duration int64) (bool, error) {
	if maxCount == 0 {
		return true, nil
	}

	length, err := rdb.LLen(ctx, key).Result()
	if err != nil {
		return false, err
	}

	if length < int64(maxCount) {
		return true, nil
	}

	oldTimeStr, _ := rdb.LIndex(ctx, key, -1).Result()
	oldTime, err := time.Parse(timeFormat, oldTimeStr)
	if err != nil {
		return false, err
	}

	nowTimeStr := time.Now().Format(timeFormat)
	nowTime, err := time.Parse(timeFormat, nowTimeStr)
	if err != nil {
		return false, err
	}

	subTime := nowTime.Sub(oldTime).Seconds()
	if int64(subTime) < duration {
		rdb.Expire(ctx, key, time.Duration(setting.ModelRequestRateLimitDurationMinutes)*time.Minute)
		return false, nil
	}

	return true, nil
}

func recordRedisRequest(ctx context.Context, rdb *redis.Client, key string, maxCount int) {
	if maxCount == 0 {
		return
	}

	now := time.Now().Format(timeFormat)
	rdb.LPush(ctx, key, now)
	rdb.LTrim(ctx, key, 0, int64(maxCount-1))
	rdb.Expire(ctx, key, time.Duration(setting.ModelRequestRateLimitDurationMinutes)*time.Minute)
}

func redisRateLimitHandler(c *gin.Context, duration int64, totalMaxCount, successMaxCount int) {
	subject := getRateLimitSubject(c)
	ctx := context.Background()
	rdb := common.RDB

	successKey := fmt.Sprintf("rateLimit:%s:%s", ModelRequestRateLimitSuccessCountMark, subject)
	allowed, err := checkRedisRateLimit(ctx, rdb, successKey, successMaxCount, duration)
	if err != nil {
		fmt.Println("检查成功请求数限制失败:", err.Error())
		abortWithOpenAiMessage(c, http.StatusInternalServerError, "rate_limit_check_failed")
		return
	}
	if !allowed {
		abortWithOpenAiMessage(c, http.StatusTooManyRequests, fmt.Sprintf("您已达到请求数限制：%d分钟内最多请求%d次", setting.ModelRequestRateLimitDurationMinutes, successMaxCount))
		return
	}

	if totalMaxCount > 0 {
		totalKey := fmt.Sprintf("rateLimit:%s", subject)
		tb := limiter.New(ctx, rdb)
		allowed, err = tb.Allow(
			ctx,
			totalKey,
			limiter.WithCapacity(int64(totalMaxCount)*duration),
			limiter.WithRate(int64(totalMaxCount)),
			limiter.WithRequested(duration),
		)

		if err != nil {
			fmt.Println("检查总请求数限制失败:", err.Error())
			abortWithOpenAiMessage(c, http.StatusInternalServerError, "rate_limit_check_failed")
			return
		}

		if !allowed {
			abortWithOpenAiMessage(c, http.StatusTooManyRequests, fmt.Sprintf("您已达到总请求数限制：%d分钟内最多请求%d次，包括失败次数，请检查您的请求是否正确", setting.ModelRequestRateLimitDurationMinutes, totalMaxCount))
			return
		}
	}

	c.Next()

	if c.Writer.Status() < 400 {
		recordRedisRequest(ctx, rdb, successKey, successMaxCount)
	}
}

func memoryRateLimitHandler(c *gin.Context, duration int64, totalMaxCount, successMaxCount int) {
	modelRequestMemoryRateLimiterOnce.Do(func() {
		inMemoryRateLimiter.Init(time.Duration(setting.ModelRequestRateLimitDurationMinutes) * time.Minute)
	})

	subject := getRateLimitSubject(c)
	totalKey := ModelRequestRateLimitCountMark + subject
	successKey := ModelRequestRateLimitSuccessCountMark + subject

	if totalMaxCount > 0 && !inMemoryRateLimiter.Request(totalKey, totalMaxCount, duration) {
		c.Status(http.StatusTooManyRequests)
		c.Abort()
		return
	}

	checkKey := successKey + "_check"
	if !inMemoryRateLimiter.Request(checkKey, successMaxCount, duration) {
		c.Status(http.StatusTooManyRequests)
		c.Abort()
		return
	}

	c.Next()

	if c.Writer.Status() < 400 {
		inMemoryRateLimiter.Request(successKey, successMaxCount, duration)
	}
}

func ModelRequestRateLimit() func(c *gin.Context) {
	return func(c *gin.Context) {
		if !setting.ModelRequestRateLimitEnabled {
			c.Next()
			return
		}

		duration := int64(setting.ModelRequestRateLimitDurationMinutes * 60)
		totalMaxCount, successMaxCount := getEffectiveRateLimit(c)

		if common.RedisEnabled {
			redisRateLimitHandler(c, duration, totalMaxCount, successMaxCount)
		} else {
			memoryRateLimitHandler(c, duration, totalMaxCount, successMaxCount)
		}
	}
}
