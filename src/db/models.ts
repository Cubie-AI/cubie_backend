import { Agent } from "./models/agent.js";
import { AgentInfo } from "./models/agentInfo.js";
import { Comment } from "./models/comment.js";
import { Nonce } from "./models/nonce.js";
import { People } from "./models/people.js";

People.belongsTo(Agent, {
  foreignKey: "agentId",
});

Agent.hasMany(AgentInfo, {
  foreignKey: "agentId",
  as: "info",
});

AgentInfo.belongsTo(Agent, {
  foreignKey: "agentId",
});

Agent.hasMany(Comment, {
  foreignKey: "agentId",
  as: "comments",
});

Comment.belongsTo(Agent, {
  foreignKey: "agentId",
});

await Agent.sync({});

await People.sync({});
await AgentInfo.sync({});
await Nonce.sync({});
await Comment.sync({});

export { Agent, AgentInfo, Comment, Nonce, People };
