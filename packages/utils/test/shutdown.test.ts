import { afterAll, expect, spyOn, test } from "bun:test"
import { onShutdown } from "../src"

const exit = spyOn(process, "exit").mockImplementation((() => undefined) as never)
afterAll(() => exit.mockRestore())

test("SIGTERM : étapes dans l'ordre d'enregistrement, une étape en échec ne bloque pas les suivantes, puis sortie en 0", async () => {
    const steps: string[] = []
    onShutdown(() => void steps.push("server"))
    onShutdown(() => {
        throw new Error("kafka down")
    })
    onShutdown(async () => void steps.push("db"))

    process.emit("SIGTERM")
    await Bun.sleep(0)

    expect(steps).toEqual(["server", "db"])
    expect(exit).toHaveBeenCalledWith(0)
})
