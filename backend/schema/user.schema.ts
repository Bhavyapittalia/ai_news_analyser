export const getUsersSchema = {
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          user_id: { type: "number" },
          name: { type: "string" },
          email: { type: "string" }
        }
      }
    }
  }
}