import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import UserProfile from "./components/UserProfile";
import HeroSection from "./components/HeroSection";
import FeaturesSection from "./components/FeaturesSection";
import TestimonialsSection from "./components/TestimonialsSection";
import HowItWorksSection from "./components/HowItWorksSection";
import CallToActionSection from "./components/CallToActionSection";
import Footer from "./components/Footer";
import ResetPassword from "./components/ResetPassword";
import "./App.css";

const Home = () => {
  return (
    <div>
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <HowItWorksSection />
      <CallToActionSection />
      <Footer />
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset" element={<ResetPassword />} />

        {/* Previously Protected Routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<UserProfile />} />
      </Routes>
    </Router>
  );
}

export default App;
