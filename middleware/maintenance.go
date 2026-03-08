package middleware

import (
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

func isMaintenanceEnabled() bool {
	return common.OptionMap["MaintenanceModeEnabled"] == "true"
}

func canBypassMaintenance(c *gin.Context) bool {
	if common.OptionMap["MaintenanceAdminBypassEnabled"] != "true" {
		return false
	}
	session := sessions.Default(c)
	if roleValue := session.Get("role"); roleValue != nil {
		if role, ok := roleValue.(int); ok {
			return role >= common.RoleAdminUser
		}
	}
	roleValue, exists := c.Get("role")
	if !exists {
		return false
	}
	role, ok := roleValue.(int)
	if !ok {
		return false
	}
	return role >= common.RoleAdminUser
}

func ShouldAllowMaintenancePath(path string) bool {
	return strings.HasPrefix(path, "/api/user/login") ||
		strings.HasPrefix(path, "/api/user/login/2fa") ||
		strings.HasPrefix(path, "/api/user/register") ||
		strings.HasPrefix(path, "/api/user/reset") ||
		strings.HasPrefix(path, "/api/oauth/") ||
		strings.HasPrefix(path, "/api/status") ||
		strings.HasPrefix(path, "/api/notice") ||
		strings.HasPrefix(path, "/api/home_page_content") ||
		strings.HasPrefix(path, "/api/user/self") ||
		strings.HasPrefix(path, "/api/option/")
}

func MaintenanceModeAPI() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !isMaintenanceEnabled() {
			c.Next()
			return
		}

		path := c.Request.URL.Path
		if ShouldAllowMaintenancePath(path) {
			c.Next()
			return
		}

		if canBypassMaintenance(c) {
			c.Next()
			return
		}

		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"message": "站点维护中，请稍后再试",
			"data": gin.H{
				"maintenance_mode_enabled": true,
				"maintenance_page_title": common.OptionMap["MaintenancePageTitle"],
				"maintenance_page_content": common.OptionMap["MaintenancePageContent"],
			},
		})
		c.Abort()
	}
}

func MaintenanceModeWeb(render func(*gin.Context)) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !isMaintenanceEnabled() {
			c.Next()
			return
		}

		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/api/") ||
			strings.HasPrefix(path, "/v1") ||
			strings.HasPrefix(path, "/mj") ||
			strings.HasPrefix(path, "/suno") ||
			strings.HasPrefix(path, "/assets/") ||
			strings.HasPrefix(path, "/favicon") ||
			strings.HasPrefix(path, "/manifest") {
			c.Next()
			return
		}

		if canBypassMaintenance(c) {
			c.Next()
			return
		}

		render(c)
		c.Abort()
	}
}
