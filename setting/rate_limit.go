package setting

import (
	"encoding/json"
	"fmt"
	"math"
	"sync"

	"github.com/QuantumNous/new-api/common"
)

var ModelRequestRateLimitEnabled = false
var ModelRequestRateLimitDurationMinutes = 1
var ModelRequestRateLimitCount = 0
var ModelRequestRateLimitSuccessCount = 1000
var ModelRequestRateLimitGroup = map[string][2]int{}
var ModelRequestRateLimitChannel = map[string][2]int{}
var ModelRequestRateLimitModel = map[string][2]int{}
var ModelRequestRateLimitMutex sync.RWMutex

func rateLimitMap2JSONString(m map[string][2]int) string {
	ModelRequestRateLimitMutex.RLock()
	defer ModelRequestRateLimitMutex.RUnlock()

	jsonBytes, err := json.Marshal(m)
	if err != nil {
		common.SysLog("error marshalling model request rate limit: " + err.Error())
	}
	return string(jsonBytes)
}

func updateRateLimitMapByJSONString(jsonStr string, target *map[string][2]int) error {
	ModelRequestRateLimitMutex.Lock()
	defer ModelRequestRateLimitMutex.Unlock()

	*target = make(map[string][2]int)
	return json.Unmarshal([]byte(jsonStr), target)
}

func getRateLimit(m map[string][2]int, key string) (totalCount, successCount int, found bool) {
	ModelRequestRateLimitMutex.RLock()
	defer ModelRequestRateLimitMutex.RUnlock()

	if m == nil {
		return 0, 0, false
	}
	limits, found := m[key]
	if !found {
		return 0, 0, false
	}
	return limits[0], limits[1], true
}

func checkRateLimitJSON(jsonStr string, entity string) error {
	checkRateLimitGroup := make(map[string][2]int)
	err := json.Unmarshal([]byte(jsonStr), &checkRateLimitGroup)
	if err != nil {
		return err
	}
	for key, limits := range checkRateLimitGroup {
		if limits[0] < 0 || limits[1] < 1 {
			return fmt.Errorf("%s %s has invalid rate limit values: [%d, %d]", entity, key, limits[0], limits[1])
		}
		if limits[0] > math.MaxInt32 || limits[1] > math.MaxInt32 {
			return fmt.Errorf("%s %s [%d, %d] has max rate limits value 2147483647", entity, key, limits[0], limits[1])
		}
	}
	return nil
}

func ModelRequestRateLimitGroup2JSONString() string {
	return rateLimitMap2JSONString(ModelRequestRateLimitGroup)
}

func ModelRequestRateLimitChannel2JSONString() string {
	return rateLimitMap2JSONString(ModelRequestRateLimitChannel)
}

func ModelRequestRateLimitModel2JSONString() string {
	return rateLimitMap2JSONString(ModelRequestRateLimitModel)
}

func UpdateModelRequestRateLimitGroupByJSONString(jsonStr string) error {
	return updateRateLimitMapByJSONString(jsonStr, &ModelRequestRateLimitGroup)
}

func UpdateModelRequestRateLimitChannelByJSONString(jsonStr string) error {
	return updateRateLimitMapByJSONString(jsonStr, &ModelRequestRateLimitChannel)
}

func UpdateModelRequestRateLimitModelByJSONString(jsonStr string) error {
	return updateRateLimitMapByJSONString(jsonStr, &ModelRequestRateLimitModel)
}

func GetGroupRateLimit(group string) (totalCount, successCount int, found bool) {
	return getRateLimit(ModelRequestRateLimitGroup, group)
}

func GetChannelRateLimit(channelID string) (totalCount, successCount int, found bool) {
	return getRateLimit(ModelRequestRateLimitChannel, channelID)
}

func GetModelRateLimit(modelName string) (totalCount, successCount int, found bool) {
	return getRateLimit(ModelRequestRateLimitModel, modelName)
}

func CheckModelRequestRateLimitGroup(jsonStr string) error {
	return checkRateLimitJSON(jsonStr, "group")
}

func CheckModelRequestRateLimitChannel(jsonStr string) error {
	return checkRateLimitJSON(jsonStr, "channel")
}

func CheckModelRequestRateLimitModel(jsonStr string) error {
	return checkRateLimitJSON(jsonStr, "model")
}
