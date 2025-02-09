package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// MessageHandler responds with a message
func MessageHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Hello from Go backend!"})
}
