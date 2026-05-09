const normalizeText = (value = "") => value.toLowerCase();

const containsAny = (text, keywords) => keywords.some((keyword) => text.includes(keyword));

const detectCategory = (description = "") => {
  const text = normalizeText(description);

  if (containsAny(text, ["wifi", "internet"])) return "Network";
  if (containsAny(text, ["water", "leak"])) return "Plumbing";
  if (containsAny(text, ["electric", "light"])) return "Electrical";

  return "General";
};

const detectPriority = (description = "") => {
  const text = normalizeText(description);

  if (containsAny(text, ["urgent", "danger", "shock", "leak"])) return "High";
  if (containsAny(text, ["issue", "problem", "not working"])) return "Medium";

  return "Low";
};

module.exports = {
  detectCategory,
  detectPriority
};
