export class AppError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string) {
        super(message)
        this.statusCode = statusCode
        this.name = "AppError"
    }
}

// export class AppError extends Error {
//   constructor(
//     public statusCode: number,
//     public code: string,
//     message: string,
//   ) {
//     super(message);
//   }
// }