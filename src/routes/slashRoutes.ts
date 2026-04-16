import { Router } from 'express';
import {
  createSlash,
  deleteSlash,
  editSlash,
  fetchSlash,
  fetchSlashes,
  joinSlash,
  searchSlash,
} from '../controllers/slash/slashControllers';

const route = Router();

route.get('/slash/', fetchSlashes);
route.get('/slash/search', searchSlash);
route.post('/slash/', createSlash);
route.get('/slash/:id', fetchSlash);
route.post('/slash/:id', joinSlash);
route.put('/slash/:id', editSlash);
route.delete('/slash/:id', deleteSlash);

export default route;
