// Maps data-ctrl names to slide controllers.
import hero from './scenes/hero.js';
import marrow from './scenes/marrow.js';
import liver from './scenes/liver.js';
import heme from './scenes/heme.js';
import indices from './scenes/indices.js';
import { caseSlide, road, divider, buildReferences } from './slides/basic.js';
import { hemato } from './slides/slo1.js';
import { spleen } from './slides/slo2.js';
import { squeeze, macro, hepcidin, liverRole, balance } from './slides/slo3.js';
import { erythro, epo, lifecycle, anemia, vessel, poly } from './slides/slo4.js';
import { vials, film, cbc, rdwmap } from './slides/slo5.js';
import { ironpath, ironstudies, chain } from './slides/slo6.js';

buildReferences();

export const registry = {
  hero, marrow, liver, heme, indices,
  case: caseSlide, road, divider,
  hemato, spleen,
  squeeze, macro, hepcidin, liverRole, balance,
  erythro, epo, lifecycle, anemia, vessel, poly,
  vials, film, cbc, rdwmap,
  ironpath, ironstudies, chain,
};
