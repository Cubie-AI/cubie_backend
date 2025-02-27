interface MakeAgentInfoParams {
  knowledge?: string[];
  style?: string[];
  twitterStyle?: string[];
  telegramStyle?: string[];
}

const defaultParams: MakeAgentInfoParams = {
  knowledge: [],
  style: [],
  twitterStyle: [],
  telegramStyle: [],
};

export function makeAgentInfo(
  id: number,
  params: MakeAgentInfoParams = defaultParams
) {
  const {
    knowledge = [],
    style = [],
    twitterStyle = [],
    telegramStyle = [],
  } = params;

  const agentInfo: { type: string; data: string }[] = [];

  knowledge.forEach((data: string) => {
    agentInfo.push({ type: "knowledge", data });
  });
  style.forEach((data: string) => {
    agentInfo.push({ type: "style", data });
  });
  twitterStyle.forEach((data: string) => {
    agentInfo.push({ type: "twitter_style", data });
  });
  telegramStyle.forEach((data: string) => {
    agentInfo.push({ type: "telegram_style", data });
  });

  return agentInfo;
}
