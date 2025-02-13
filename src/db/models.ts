import { Agent } from "./models/agent.js";
import { AgentInfo } from "./models/agentInfo.js";
import { People } from "./models/people.js";

Agent.hasMany(People, {
  as: "people",
});

People.belongsTo(Agent);

Agent.hasMany(AgentInfo, {
  as: "agentInfo",
});

AgentInfo.belongsTo(Agent);

await Agent.sync();
await People.sync();
await AgentInfo.sync();

export { Agent, AgentInfo, People };
