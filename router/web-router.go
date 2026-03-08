package router

import (
	"embed"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/gin-contrib/gzip"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
)

func SetWebRouter(router *gin.Engine, buildFS embed.FS, indexPage []byte, homePage []byte) {
	renderIndexPage := func(c *gin.Context) {
		c.Header("Cache-Control", "no-cache")
		if len(homePage) > 0 && c.Request.URL.Path == "/landing" {
			c.Data(http.StatusOK, "text/html; charset=utf-8", homePage)
			return
		}
		if len(homePage) > 0 && c.Request.URL.Path == "/" {
			if c.Query("view") == "landing" || c.Request.Referer() == "" {
				c.Data(http.StatusOK, "text/html; charset=utf-8", homePage)
				return
			}
		}
		c.Data(http.StatusOK, "text/html; charset=utf-8", indexPage)
	}

	renderMaintenancePage := func(c *gin.Context) {
		pageMode := strings.TrimSpace(common.OptionMap["MaintenancePageMode"])
		if pageMode == "redirect" {
			redirectURL := strings.TrimSpace(common.OptionMap["MaintenanceIframeURL"])
			if redirectURL != "" {
				c.Header("Cache-Control", "no-cache")
				c.Redirect(http.StatusFound, redirectURL)
				return
			}
		}

		iframeURL := strings.TrimSpace(common.OptionMap["MaintenanceIframeURL"])
		if pageMode == "iframe" && iframeURL != "" {
			maintenanceHTML := fmt.Sprintf(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>站点维护中</title>
  <style>
    html, body { margin: 0; width: 100%%; height: 100%%; background: #0f172a; overflow: hidden; }
    iframe { width: 100%%; height: 100%%; border: 0; display: block; background: #fff; }
  </style>
</head>
<body>
  <iframe src="%s" referrerpolicy="no-referrer"></iframe>
</body>
</html>`, iframeURL)
			c.Header("Cache-Control", "no-cache")
			c.Data(http.StatusServiceUnavailable, "text/html; charset=utf-8", []byte(maintenanceHTML))
			return
		}

		title := common.OptionMap["MaintenancePageTitle"]
		if title == "" {
			title = "站点维护中"
		}
		content := common.OptionMap["MaintenancePageContent"]
		if content == "" {
			content = "站点正在维护中，请稍后再试。"
		}
		countdownText := "暂未设置"
		estimatedText := "暂未设置"
		if raw := common.OptionMap["MaintenanceCountdownTarget"]; raw != "" {
			if parsed, err := time.Parse(time.RFC3339, raw); err == nil {
				diff := time.Until(parsed)
				if diff > 0 {
					hours := int(diff.Hours())
					minutes := int(diff.Minutes()) % 60
					countdownText = fmt.Sprintf("约 %d 小时 %d 分钟", hours, minutes)
				} else {
					countdownText = "维护即将开始或正在进行中"
				}
			}
		}
		if raw := common.OptionMap["MaintenanceEstimatedCompletionTime"]; raw != "" {
			if parsed, err := time.Parse(time.RFC3339, raw); err == nil {
				estimatedText = parsed.Local().Format("2006-01-02 15:04:05")
			}
		}
		maintenanceHTML := fmt.Sprintf(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>%s</title>
  <style>
    body { margin: 0; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: linear-gradient(135deg, #111827, #1f2937); color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { width: min(680px, 100%%); background: rgba(127, 29, 29, 0.94); border: 1px solid rgba(252, 165, 165, 0.4); border-radius: 24px; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35); padding: 32px; }
    .badge { display: inline-flex; padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,0.12); font-size: 14px; font-weight: 600; }
    h1 { margin: 18px 0 10px; font-size: 34px; }
    p { margin: 0; color: rgba(255,255,255,0.88); line-height: 1.7; }
    .meta { margin-top: 24px; display: grid; gap: 12px; }
    .item { background: rgba(255,255,255,0.08); border-radius: 16px; padding: 14px 16px; }
    .label { font-size: 13px; color: rgba(255,255,255,0.72); margin-bottom: 4px; }
    .value { font-size: 16px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">系统维护中</div>
    <h1>%s</h1>
    <p>%s</p>
    <div class="meta">
      <div class="item">
        <div class="label">维护倒计时</div>
        <div class="value">%s</div>
      </div>
      <div class="item">
        <div class="label">预计完成时间</div>
        <div class="value">%s</div>
      </div>
    </div>
  </div>
</body>
</html>`, title, title, content, countdownText, estimatedText)
		c.Header("Cache-Control", "no-cache")
		c.Data(http.StatusServiceUnavailable, "text/html; charset=utf-8", []byte(maintenanceHTML))
	}

	router.Use(gzip.Gzip(gzip.DefaultCompression))
	router.Use(middleware.GlobalWebRateLimit())
	router.Use(middleware.Cache())
	router.Use(middleware.MaintenanceModeWeb(renderMaintenancePage))

	router.GET("/channel_health.json", func(c *gin.Context) {
		c.Set(middleware.RouteTagKey, "web")
		exe, _ := os.Executable()
		candidates := []string{
			filepath.Join(filepath.Dir(exe), "channel_health.json"),
			filepath.Join(".", "channel_health.json"),
			filepath.Join(".", "web", "dist", "channel_health.json"),
		}
		for _, p := range candidates {
			if data, err := os.ReadFile(p); err == nil {
				c.Header("Cache-Control", "no-cache")
				c.Data(http.StatusOK, "application/json; charset=utf-8", data)
				return
			}
		}
		if data, err := buildFS.ReadFile("web/dist/channel_health.json"); err == nil {
			c.Header("Cache-Control", "no-cache")
			c.Data(http.StatusOK, "application/json; charset=utf-8", data)
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "channel_health.json not found"})
	})

	router.Static("/uploads", "./uploads")
	router.GET("/", func(c *gin.Context) {
		c.Set(middleware.RouteTagKey, "web")
		if common.OptionMap["MaintenanceModeEnabled"] == "true" && !middleware.ShouldAllowMaintenancePath(c.Request.RequestURI) {
			renderMaintenancePage(c)
			return
		}
		renderIndexPage(c)
	})
	router.GET("/landing", func(c *gin.Context) {
		c.Set(middleware.RouteTagKey, "web")
		if common.OptionMap["MaintenanceModeEnabled"] == "true" && !middleware.ShouldAllowMaintenancePath(c.Request.RequestURI) {
			renderMaintenancePage(c)
			return
		}
		renderIndexPage(c)
	})

	router.Use(static.Serve("/", common.EmbedFolder(buildFS, "web/dist")))
	router.NoRoute(func(c *gin.Context) {
		c.Set(middleware.RouteTagKey, "web")
		if common.OptionMap["MaintenanceModeEnabled"] == "true" && !middleware.ShouldAllowMaintenancePath(c.Request.RequestURI) {
			renderMaintenancePage(c)
			return
		}
		if strings.HasPrefix(c.Request.RequestURI, "/v1") || strings.HasPrefix(c.Request.RequestURI, "/api") || strings.HasPrefix(c.Request.RequestURI, "/assets") {
			controller.RelayNotFound(c)
			return
		}
		renderIndexPage(c)
	})
}
