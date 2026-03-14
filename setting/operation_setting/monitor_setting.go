package operation_setting

import (
	"os"
	"strconv"

	"github.com/QuantumNous/new-api/setting/config"
)

type MonitorSetting struct {
	AutoTestChannelEnabled     bool    `json:"auto_test_channel_enabled"`
	AutoTestChannelMinutes     float64 `json:"auto_test_channel_minutes"`
	ChannelHealthCheckEnabled  bool    `json:"channel_health_check_enabled"`  // 渠道可用性检测启用
	ChannelHealthCheckInterval int     `json:"channel_health_check_interval"` // 检测间隔（秒）
	ChannelHealthCheckModel    string  `json:"channel_health_check_model"`    // 检测使用的模型
}

// 默认配置
var monitorSetting = MonitorSetting{
	AutoTestChannelEnabled:     false,
	AutoTestChannelMinutes:     10,
	ChannelHealthCheckEnabled:  true,
	ChannelHealthCheckInterval: 900,
	ChannelHealthCheckModel:    "",
}

func init() {
	// 注册到全局配置管理器
	config.GlobalConfig.Register("monitor_setting", &monitorSetting)
}

func GetMonitorSetting() *MonitorSetting {
	if os.Getenv("CHANNEL_TEST_FREQUENCY") != "" {
		frequency, err := strconv.Atoi(os.Getenv("CHANNEL_TEST_FREQUENCY"))
		if err == nil && frequency > 0 {
			monitorSetting.AutoTestChannelEnabled = true
			monitorSetting.AutoTestChannelMinutes = float64(frequency)
		}
	}
	return &monitorSetting
}
