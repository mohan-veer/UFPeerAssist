package main

import (
	"time"
	"ufpeerassist/backend/api/routes"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {

	router := gin.Default()

	//Enable CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"}, // where reactfrontend is running
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           6 * time.Hour, // cache response for 6 hours
	}))

	// setup the other routes
	routes.SetupRoutes(router)

	// Run server on port 8080
	router.Run(":8080")
}
