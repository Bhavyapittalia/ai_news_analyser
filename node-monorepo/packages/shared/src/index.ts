export interface User {
    id: number;
    name: string;
    email: string;
}

export const APP_NAME = "Node Monorepo";

export const add = (a: number, b: number): number => {
    return a + b;
};