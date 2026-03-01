package router

import (
	"embed"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/gin-contrib/gzip"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
)

func SetWebRouter(router *gin.Engine, buildFS embed.FS, indexPage []byte) {
	router.Use(gzip.Gzip(gzip.DefaultCompression))
	router.Use(middleware.GlobalWebRateLimit())
	router.Use(middleware.Cache())

	router.GET("/model_health.json", func(c *gin.Context) {
		c.Set(middleware.RouteTagKey, "web")
		exe, _ := os.Executable()
		candidates := []string{
			filepath.Join(filepath.Dir(exe), "model_health.json"),
			filepath.Join(".", "model_health.json"),
			filepath.Join(".", "web", "dist", "model_health.json"),
		}
		for _, p := range candidates {
			if data, err := os.ReadFile(p); err == nil {
				c.Header("Cache-Control", "no-cache")
				c.Data(http.StatusOK, "application/json; charset=utf-8", data)
				return
			}
		}
		if data, err := buildFS.ReadFile("web/dist/model_health.json"); err == nil {
			c.Header("Cache-Control", "no-cache")
			c.Data(http.StatusOK, "application/json; charset=utf-8", data)
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "model_health.json not found"})
	})

	router.Use(static.Serve("/", common.EmbedFolder(buildFS, "web/dist")))
	router.NoRoute(func(c *gin.Context) {
		c.Set(middleware.RouteTagKey, "web")
		if strings.HasPrefix(c.Request.RequestURI, "/v1") || strings.HasPrefix(c.Request.RequestURI, "/api") || strings.HasPrefix(c.Request.RequestURI, "/assets") {
			controller.RelayNotFound(c)
			return
		}
		c.Header("Cache-Control", "no-cache")
		c.Data(http.StatusOK, "text/html; charset=utf-8", indexPage)
	})
}
