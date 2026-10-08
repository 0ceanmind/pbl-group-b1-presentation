// Case values (Group B-1 PBL document) and verified reference data.

export const CASE = {
  rbc: 4.1, // ×10^6/µL
  hb: 8.9, // g/dL
  hct: 29, // %
  mcv: 68, // fL
  mch: 21, // pg
  mchc: 29, // g/dL
  rdw: 18, // %
  retic: 0.7, // %
};

// Adult reference intervals (female where sex-specific).
// Hb, Hct, RBC, MCV, MCH, RDW: StatPearls "Normal and Abnormal Complete Blood Count With Differential".
// MCHC: Sarma PR, "Red Cell Indices", Clinical Methods (3rd ed.), Ch. 152.
export const RANGES = {
  rbc: { lo: 4.2, hi: 5.4, unit: '×10⁶/µL' },
  hb: { lo: 12, hi: 16, unit: 'g/dL' },
  hct: { lo: 36, hi: 48, unit: '%' },
  mcv: { lo: 80, hi: 100, unit: 'fL' },
  mch: { lo: 27, hi: 32, unit: 'pg' },
  mchc: { lo: 32, hi: 36, unit: 'g/dL' },
  rdw: { lo: 11.5, hi: 15, unit: '%' },
};

// mL of O2 bound per gram of hemoglobin (StatPearls, Physiology: Oxygen Transport)
export const O2_PER_G_HB = 1.34;

export const REFERENCES = {
  // exactly as listed in the Group B-1 research document
  group: [
    { text: '<b>Guyton and Hall, Textbook of Medical Physiology.</b> Chapter 33, p. 453.' },
    { text: '<b>NCBI Bookshelf.</b> Anatomy, Abdomen and Pelvis: Liver.', url: 'ncbi.nlm.nih.gov/books/NBK500014' },
    { text: '<b>Cullen, J. M.</b> Histopathology — Normal Liver Histology. PMC.' },
    { text: '<b>OpenStax.</b> Biology — Adaptive Immune Response.', url: 'openstax.org/books/biology-2e/pages/42-2-adaptive-immune-response' },
  ],
  // used to verify figures, reference intervals and diagrams in this presentation
  extra: [
    { text: '<b>StatPearls.</b> Normal and Abnormal Complete Blood Count With Differential — reference intervals.', url: 'ncbi.nlm.nih.gov/books/NBK604207' },
    { text: '<b>Sarma PR.</b> Red Cell Indices. <i>Clinical Methods</i>, 3rd ed., Ch. 152 — MCHC interval.', url: 'ncbi.nlm.nih.gov/books/NBK260' },
    { text: '<b>StatPearls.</b> Physiology, Oxygen Transport — 1.34 mL O₂ per g Hb.', url: 'ncbi.nlm.nih.gov/books/NBK538336' },
    { text: '<b>StatPearls.</b> Anemia · Iron-Binding Capacity — iron studies; ferroportin as the sole known iron exporter.', url: 'ncbi.nlm.nih.gov/books/NBK499994 · NBK559119' },
    { text: '<b>StatPearls.</b> Biochemistry, Iron Absorption · Physiology, Hepcidin.', url: 'ncbi.nlm.nih.gov/books/NBK448204 · NBK538257' },
    { text: '<b>StatPearls.</b> Biochemistry, Heme Synthesis.', url: 'ncbi.nlm.nih.gov/books/NBK537329' },
    { text: '<b>StatPearls.</b> Anatomy, Abdomen and Pelvis, Spleen · Physiology, Liver.', url: 'ncbi.nlm.nih.gov/books/NBK482235 · NBK535438' },
    { text: '<b>Li W, et al.</b> Erythroblastic island macrophages. <i>Front Cell Dev Biol</i> 2020 · <b>Machlus KR, Italiano JE.</b> Megakaryocyte to platelet. <i>J Cell Biol</i> 2013.', url: 'PMC7907436 · PMC3678154' },
  ],
};
