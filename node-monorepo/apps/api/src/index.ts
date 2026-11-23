import Fastify from "fastify"
import { APP_NAME,add, type User} from "@repo/shared"

const app = Fastify({ logger: true });

const PORT = 5000;

app.get("/", async () => {
    return { message: "Welcome to Monorepo API", application: APP_NAME };
});

app.get("/sum", async () => {
    return { result: add(10, 20) };
});

app.get("/user", async (): Promise<User> => {
    return { id: 1, name: "Dev", email: "dev@example.com"};
});

const start = async () => {
    try {
        await app.listen({ port: PORT });
        console.log(`Server running on port ${PORT}`);
    } catch (error) {
        app.log.error(error);
        process.exit(1);
    }
};

start();