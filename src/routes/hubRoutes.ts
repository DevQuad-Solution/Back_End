import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import {
  fetchCitiesByState,
  fetchHubsByStateAndCity,
  fetchStates,
  fetchHubRatings,
  rateHub,
} from '../controllers/hub/hubControllers';

const route = Router();

route.get('/hub/', fetchStates);
route.get('/hub/:state', fetchCitiesByState);
route.get('/hub/:state/:city', fetchHubsByStateAndCity);
route.get('/hub/:hubId/ratings', fetchHubRatings);
route.post('/hub/:hubId/rating', authMiddleware, requireRole('user'), rateHub);

export default route;
