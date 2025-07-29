function computeAcneMetrics(predictions = []) {
  const unwanted = new Set(["Freckles", "Mole", "Post-Acne Scar", "Post-Acne Spot"]);
  const acneClasses = [
    "Comedones",
    "Cysts",
    "Microcysts",
    "Nodules",
    "Papules",
    "Pustules",
  ];

  const filtered = predictions.filter((p) => !unwanted.has(p.class));
  const counts = Object.fromEntries(acneClasses.map((k) => [k, 0]));
  filtered.forEach((p) => {
    if (counts.hasOwnProperty(p.class)) {
      counts[p.class]++;
    }
  });

  const total = Object.values(counts).reduce((s, n) => s + n, 0);
  const severity =
    total === 0
      ? "None"
      : total <= 5
      ? "Mild"
      : total <= 20
      ? "Moderate"
      : "Severe";

  const classify = (c) => {
    if (c.Nodules) return "nodulo-cistica";
    if (c.Cysts) return "cistica";
    if (c.Papules || c.Pustules) return "papulopustolosa";
    if (
      !c.Nodules &&
      !c.Cysts &&
      !c.Papules &&
      !c.Pustules &&
      c.Comedones <= 2 &&
      !c.Microcysts
    )
      return "no-acne";
    return c.Comedones >= c.Microcysts ? "comedonica" : "microcistica";
  };

  return { counts, severity, classification: classify(counts) };
}

module.exports = { computeAcneMetrics }; 