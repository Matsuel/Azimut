import { afterEach, expect, test } from "bun:test"
import { act, cleanup, renderHook } from "@testing-library/react"
import { setFormIssues } from "../src/components/form/form-issues"
import { useDebouncedValue } from "../src/hooks/use-debounced-value"
import { ApiError } from "../src/lib/api"

afterEach(cleanup)

test("setFormIssues place chaque issue d'un 400 sous son champ, message traduit par code ; ignore les autres erreurs", () => {
    const errors: [string, { message: string }][] = []
    const setError = ((path: string, error: { message: string }) => void errors.push([path, error])) as never
    const body = { issues: [{ path: ["end"], params: { code: "END_BEFORE_START" } }, { path: ["name"] }] }

    setFormIssues(new ApiError(400, "Bad Request", body), setError, (code) => `msg:${code}`)
    setFormIssues(new ApiError(500, "Server Error", body), setError, (code) => `msg:${code}`)

    expect(errors).toEqual([
        ["end", { message: "msg:END_BEFORE_START" }],
        ["name", { message: "msg:null" }],
    ])
})

test("useDebouncedValue : recopie la valeur après le délai sans changement, une saisie rapide repousse le délai", async () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 20), {
        initialProps: { value: "a" },
    })

    rerender({ value: "ap" })
    await act(() => Bun.sleep(10))
    rerender({ value: "app" })
    await act(() => Bun.sleep(10))
    expect(result.current).toBe("a")

    await act(() => Bun.sleep(20))
    expect(result.current).toBe("app")
})
