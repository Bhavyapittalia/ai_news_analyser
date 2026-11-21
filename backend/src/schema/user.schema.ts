export const getUsersSchema = {
  response: {
    202: {
      type: "array",
      items: {
        type: "object",
        properties: {
          success: {type: "boolean"},
          user_id: { type: "number" },
          name: { type: "string" },
          email: { type: "string" }
        }
      }
    }
  }
}