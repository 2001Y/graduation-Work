import { useState, useEffect, useRef } from 'react';

function RadioList({ data, onSelected, isLoading }) {
    if (!data) {
        return <>ロード中...</>; // あるいは null を返して何も表示しない
    }

    const uniqueName = data.date;
    return (
        <div style={{ margin: '15px' }}>
            {data.output.map((item, index) => (
                <label key={index} style={{ paddingBottom: '10px' }}>
                    <input
                        type="radio"
                        name={uniqueName}
                        value={item.content}
                        onChange={(e) => onSelected(e.target.value)}
                    />
                    {item.content} - {item.title}
                </label>
            ))}
            {isLoading && <p>ロード中...</p>}
        </div>
    );
}


export default function TestPage() {
    const [title, setTitle] = useState('今、なんて言われた？');
    const [subTitle, setSubTitle] = useState('ChatGPT版');
    const [inputText, setInputText] = useState('');
    const [lists, setLists] = useState([]);
    const [initialLoading, setInitialLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = async (inputValue, index) => {
        if (index === null) setInitialLoading(true);

        setLists((prevLists) => {
            const updatedLists = [...prevLists];
            if (index !== null) updatedLists[index].isLoading = true;
            return updatedLists;
        });

        try {
            const response = await fetch(`/api/test2?inputText=${inputValue}`);
            const data = await response.json();
            setError(null);
            return data;
        } catch (error) {
            console.error("Error fetching data:", error);
            setError('データの取得に失敗しました。');
            return null;
        } finally {
            setInitialLoading(false);
            setLists((prevLists) => {
                const updatedLists = [...prevLists];
                if (index !== null) updatedLists[index].isLoading = false;
                return updatedLists;
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setTitle(inputText);
        setSubTitle("今、なんて言われた？")
        const data = await fetchData(inputText, null);
        if (data) setLists([{ data, isLoading: false }]);
    };

    const handleRadioSelected = async (content) => {
        const newListItem = {
            data: null,
            isLoading: true
        };
        setLists((prevLists) => [...prevLists, newListItem]);

        const index = lists.length;
        const data = await fetchData(content, index);
        if (data) {
            setLists((prevLists) => {
                const updatedLists = [...prevLists];
                updatedLists[index].data = data;
                updatedLists[index].isLoading = false;
                return updatedLists;
            });
        }
    };

    const scrollWrapperRef = useRef(null);
    const scrollInnerRef = useRef(null);
    useEffect(() => {
        const scrollInner = scrollInnerRef.current;
        if (scrollInner) {
            const observer = new ResizeObserver(() => {
                const scrollInner = scrollInnerRef.current;
                if (scrollInner) {
                    console.log(scrollInnerRef.current.scrollWidth)
                    scrollWrapperRef.current.scrollLeft = scrollInnerRef.current.scrollWidth;
                }
            });
            observer.observe(scrollInner);
            // Cleanup
            return () => {
                observer.disconnect();
            };
        }
    }, []);


    return (
        <div>
            <p>{subTitle}</p>
            <h1>{title}</h1>
            {initialLoading ? (
                <>
                    <p>生成中...</p>
                </>
            ) : lists.length === 0 ? (
                <>
                    <form onSubmit={handleSubmit}>
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="例: 車欲しいんだよね"
                        />
                        <button type="submit">▶︎</button>
                    </form>
                </>
            ) : (
                <div className="scroll" ref={scrollWrapperRef}>
                    <div className="scrollInner" ref={scrollInnerRef}>
                        {lists.map((list, index) => (
                            <RadioList
                                key={index}
                                data={list.data}
                                onSelected={handleRadioSelected}
                                isLoading={list.isLoading}
                            />
                        ))}
                    </div>
                </div>
            )
            }
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div >
    );
}
