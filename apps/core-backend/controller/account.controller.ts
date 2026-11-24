import type { Request, Response } from "express"
import AccountService from "../services/account.service"

class AccountController {

    private accountService = new AccountService()

    resetAccount = async (req: Request, res: Response) => {
        await this.accountService.resetData(req.userId!)
        res.status(204).send()
    }
}

export default AccountController
