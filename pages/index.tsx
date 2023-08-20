import React, { useEffect, useRef } from 'react';
import { Matter, Engine, Render, Runner, Body, MouseConstraint, Mouse, World, Bodies, Events } from 'matter-js';

export default function Home() {
  const containerRef = useRef(null);
  useEffect(() => {
    if (!containerRef.current) return;
    // Create engine (physical simulation) and renderer (drawing)
    const engine = Engine.create();
    const { world } = engine;

    // Function to adjust canvas size on window resize
    function resizeCanvas() {
      const canvas = render.canvas;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    const render = Render.create({
      element: containerRef.current,
      engine: engine,
      options: {
        width: 800,
        height: 600,
        wireframes: false,
        background: 'linear-gradient(to bottom, #87ceeb, #439ad9)'
      }
    });

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    Render.run(render);
    Runner.run(Runner.create(), engine);

    // フレームの四辺1.5倍の位置に壁を追加
    const wallThickness = 100; // 壁の厚さ
    const frameWidth = window.innerWidth;
    const frameHeight = window.innerHeight;
    const margin = 600;
    const walls = [
      Bodies.rectangle(frameWidth / 2, -margin,
        frameWidth + wallThickness * 2, wallThickness, { isStatic: true }), // 上側の壁
      Bodies.rectangle(frameWidth / 2, frameHeight + margin,
        frameWidth + wallThickness * 2, wallThickness, { isStatic: true }), // 下側の壁
      Bodies.rectangle(-margin, frameHeight / 2,
        wallThickness, frameHeight + wallThickness * 2, { isStatic: true }), // 左側の壁
      Bodies.rectangle(frameWidth + margin, frameHeight / 2,
        wallThickness, frameHeight + wallThickness * 2, { isStatic: true }) // 右側の壁
    ];
    World.add(world, walls);

    // 大きな円のサイズを設定
    function createBigCircleSize() {
      return Math.min(window.innerWidth, window.innerHeight) / 5;
    }

    // 小さな円を生成する関数
    function createSmallCircle(x, y, radius) {
      return Bodies.circle(x, y, radius, {
        render: { fillStyle: 'rgba(250,250,250,.5)' } // 不透明のホワイトに設定
      });
    }

    // 真ん中に大きな丸を追加
    const bigCircleSize = createBigCircleSize();
    let bigCircle = Bodies.circle(window.innerWidth / 2, window.innerHeight / 2, bigCircleSize, {
      render: { fillStyle: 'rgba(250,250,250,.5)' } // 不透明のホワイトに設定
    });
    bigCircle.isStatic = true; // bigCircleを固定
    World.add(world, bigCircle);

    // 周囲に小さな丸を追加
    let smallCircles = [];
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight;
      const radius = bigCircleSize / 1.5;
      const smallCircle = createSmallCircle(x, y, radius);
      smallCircles.push(smallCircle);
      World.add(world, smallCircle);
    }
    console.log(smallCircles)

    // マウスで物体を操作するための制約を追加
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: Mouse.create(render.canvas)
    });
    World.add(world, mouseConstraint);

    // クリックイベントを追加
    Events.on(mouseConstraint, 'mousedown', function (event) {
      const clickedBody = event.source.body;
      if (!clickedBody) {
        // クリックされた場所が物体上でない場合は処理をスキップ
        return;
      }

      if (!clickedBody.isStatic && clickedBody !== bigCircle) {

        // 他の円と大きな円を削除
        Matter.Composite.remove(world, bigCircle);
        for (let i = 0; i < smallCircles.length; i++) {
          Matter.Composite.remove(world, smallCircles[i]);
        }

        // クリックした円を真ん中の大きな丸にする
        const x = clickedBody.position.x;
        const y = clickedBody.position.y;
        const radius = createBigCircleSize();
        bigCircle = Bodies.circle(x, y, radius, {
          render: { fillStyle: 'rgba(250,250,250,.5)' } // 不透明のホワイトに設定
        });
        bigCircle.isStatic = true; // bigCircleを固定
        World.add(world, bigCircle);

        // 周りに新しい小さな丸を追加
        smallCircles = [];
        for (let i = 0; i < 10; i++) {
          const x = Math.random() * window.innerWidth;
          const y = Math.random() * window.innerHeight;
          const radius = bigCircleSize / 1.5;
          const smallCircle = createSmallCircle(x, y, radius);
          smallCircles.push(smallCircle);
          World.add(world, smallCircle);
        }

      }
    });


    // 重力を中心の大きな丸に向ける
    engine.world.gravity.scale = 0; // デフォルトの重力を無効化
    engine.world.gravity.x = 1; // 右に向ける
    engine.world.gravity.y = 0;

    // テキストを表示するためのHTML要素を作成
    function createTextElement(text, x, y) {
      const textElement = document.createElement('div');
      textElement.classList.add('text-element');
      textElement.style.position = 'absolute';
      textElement.style.left = x + 'px';
      textElement.style.top = y + 'px';
      textElement.textContent = text;
      document.body.appendChild(textElement);
      return textElement;
    }

    // 周りの小さな円のテキスト
    const textElements = [];
    for (let i = 0; i < smallCircles.length; i++) {
      const smallCircle = smallCircles[i];
      const smallCircleTextElement = createTextElement('Circle ' + (i + 1), smallCircle.position.x, smallCircle.position.y);
      textElements.push(smallCircleTextElement);
    }

    Events.on(engine, 'afterUpdate', function () {
      for (let i = 0; i < engine.world.bodies.length; i++) {
        const body = engine.world.bodies[i];

        // 重力の強さを計算
        const rotationForceMagnitude = 0.00003 * body.mass; // 右回転の力の強さ
        const centerForceMagnitude = 0.0001 * body.mass; // 中心の円に対する引力の強さ

        // 大きな丸の中心へのベクトルを計算
        const dx = bigCircle.position.x - body.position.x;
        const dy = bigCircle.position.y - body.position.y;

        // ベクトルを正規化
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalisedDx = dx / distance;
        const normalisedDy = dy / distance;

        // ベクトルを反転して右回転の力を適用
        Body.applyForce(body, body.position, {
          x: -rotationForceMagnitude * normalisedDy,
          y: rotationForceMagnitude * normalisedDx
        });

        // 中心の円に引力を適用
        Body.applyForce(body, body.position, {
          x: centerForceMagnitude * normalisedDx,
          y: centerForceMagnitude * normalisedDy
        });

        // テキストの位置を更新
        if (textElements[i]) { // Check if the text element exists
          textElements[i].style.left = body.position.x - textElements[i].clientWidth / 2 + 'px';
          textElements[i].style.top = body.position.y - textElements[i].clientHeight / 2 + 'px';
        }
      }
    });

    // Cleanup to prevent memory leaks
    return () => {
      Render.stop(render);
      Runner.stop(Runner.create());
      window.removeEventListener('resize', resizeCanvas);
      Events.off(engine);
    }

  }, []); // Empty dependency array ensures this useEffect runs only once (on mount)

  return (
    <div>
      <h3>react-physics</h3>
      <div ref={containerRef}></div>
    </div>
  );
}