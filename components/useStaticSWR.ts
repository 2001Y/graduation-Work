import { useEffect } from 'react'
import useSWR from 'swr'

const useStaticSWR = <T>(key: string, initialData: T) => {
    const { data = initialData, mutate } = useSWR<T>(key, null, {
        fallbackData: initialData,
        revalidateOnFocus: false, // 画面フォーカス時の再検証（apiリクエスト）をオフ
        revalidateOnMount: false, // コンポーネントマウント時の再検証（apiリクエスト）をオフ
        revalidateOnReconnect: false, // ブラウザがネットワーク接続できた時の再検証(apiリクエスト)をオフ
        revalidateIfStale: false, // キャッシュが古くなったときの再検証（apiリクエスト）をオフ
    })

    useEffect(() => {
        // swrでキャッシュされているdataがundefinedだった場合に、initialDataをset
        mutate((_data) => _data || initialData, false)
    }, [])

    return { data, mutate }
}

export default useStaticSWR