declare global {
  namespace Express {
    interface Request {
      address: string;
    }
  }
}

export {};
