import { DataTypes, Model } from "sequelize";
import { db } from "../connection.js";
import { AgentInfo } from "./agentInfo.js";
import { People } from "./people.js";

export class Agent extends Model {
  declare id: number;
  declare name: string;
  declare ticker: string;
  declare mint: string;
  declare owner: string;
  declare image_url: string;
  declare bio: string;
  declare telegram: string;
  declare tw_password: string;
  declare tw_email: string;
  declare tw_handle: string;
  declare telegram_bot_token: string;
  declare feeAccountPublicKey: string;
  declare feeAccountPrivateKey: string;
  declare status: "active" | "pending";
  declare people: People[];
  declare agentInfo: AgentInfo[];
}

Agent.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ticker: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mint: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    owner: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bio: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    telegram: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tw_password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tw_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tw_handle: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    telegram_bot_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    feeAccountPublicKey: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    feeAccountPrivateKey: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize: db,
    tableName: "agents",
  }
);
