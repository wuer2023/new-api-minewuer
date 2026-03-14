package controller

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetLeaderboard(c *gin.Context) {
	// Proxy request to the scraper service
	resp, err := http.Get("http://localhost:8080/leaderboard")
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Failed to fetch leaderboard data: " + err.Error(),
		})
		return
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Failed to decode leaderboard data: " + err.Error(),
		})
		return
	}

	// Wrap in standard response format
	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       result["data"],
		"updated_at": result["updated_at"],
	})
}
