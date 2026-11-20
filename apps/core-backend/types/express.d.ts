declare namespace Express {
    interface Request {
        userId?: string
        userRole?: string | null // `user.role` de la session better-auth, liste séparée par des virgules
    }
}