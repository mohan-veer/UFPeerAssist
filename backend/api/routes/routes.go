package routes

import (
	"ufpeerassist/backend/api/handlers"

	"github.com/gin-gonic/gin"
)

// router *gin.Engine)
func SetupRoutes(router *gin.Engine) {
	router.GET("/api/home/button", handlers.MessageHandler)
}
