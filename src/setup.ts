import { EnvValidatex, type Constraints } from "env-validatex";

const constraints: Constraints = {
  DATABASE_URL: {
    type: "string",
    required: true,
  },
  REVALIDATE_API_KEY: {
    type: "string",
    required: true,
  },
  REVALIDATE_URL: {
    type: "string",
    required: true,
  },
};

const validator = new EnvValidatex(constraints, {
  basePath: process.cwd(),
  files: [".env"],
  exitOnError: true,
  silent: false,
});

validator.loadAndValidate();