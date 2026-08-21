"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const roleMiddleware_1 = require("../middlewares/roleMiddleware");
const hubControllers_1 = require("../controllers/hub/hubControllers");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const route = (0, express_1.Router)();
// Apply rate limit for hub lookups
route.use(rateLimiter_1.hubRateLimit);
route.get('/hub/', hubControllers_1.fetchStates);
route.get('/hub/:state', hubControllers_1.fetchCitiesByState);
route.get('/hub/:state/:city', hubControllers_1.fetchHubsByStateAndCity);
route.get('/hub/:hubId/ratings', hubControllers_1.fetchHubRatings);
route.post('/hub/:hubId/rating', authMiddleware_1.authMiddleware, (0, roleMiddleware_1.requireRole)('user'), hubControllers_1.rateHub);
exports.default = route;
