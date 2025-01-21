import { NextApiRequest, NextApiResponse } from "next";
// import cors from 'nextjs-cors';
import { createOpenApiNextHandler, OpenApiRouter } from "trpc-openapi";

import { appRouter, createTRPCContext } from "@repo/api";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Setup CORS
  // await cors(req, res);

  // Handle incoming OpenAPI requests
  return createOpenApiNextHandler({
    router: appRouter as OpenApiRouter,
    createContext: createTRPCContext,
  })(req, res);
};

export default handler;
