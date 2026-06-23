/** Keep recommender intro short; strip duplicate module lists meant for cards. */
export function formatRecommenderIntro(explanation: string): string {
  let text = explanation
    .split(/\*\*Recommended modules?\*\*/i)[0]
    .split(/Recommended modules?:/i)[0]
    .replace(/\*\*[^*]+\*\* \(ID: \d+\)[^\n]*/g, "")
    .trim();

  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 2) {
    return sentences.slice(0, 2).join(" ").trim();
  }
  return text;
}

/** Strip legacy markdown module dumps when cards are shown or content looks duplicated. */
export function displayAssistantContent(
  content: string,
  recommendedModules?: { moduleId: number }[],
): string {
  if (recommendedModules && recommendedModules.length > 0) {
    return formatRecommenderIntro(content);
  }
  if (/Recommended modules?:/i.test(content)) {
    return formatRecommenderIntro(content);
  }
  return content;
}
