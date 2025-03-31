package routes

import (
	"ufpeerassist/backend/api/handlers"

	"github.com/gin-gonic/gin"
)

// router *gin.Engine)
func SetupRoutes(router *gin.Engine) {
	router.GET("/api/home/button", handlers.MessageHandler)

	// login and signup realted routes
	router.POST("/signup", handlers.Signup)
	router.POST("/login", handlers.Login)
	router.POST("/requestPasswordReset", handlers.GenerateOTPForResetPassword)
	router.POST("/validateOtpAndUpdatePassword", handlers.ValidateOtpAndUpdatePassword)

	// user routes
	router.GET("/users/:email/profileinfo", handlers.GetUserProfile)
	router.PUT("/users/:email/profileupdate", handlers.UpdateUserProfile)

	// user post a task
	// task routes with no conflicts
	router.POST("/users/:email/post_task", handlers.PostATask)

	// Routes with authentication via viewer_email parameter
	router.GET("/tasks/feed/:viewer_email", handlers.GetAllTasksForUser) // Get all available tasks

}
