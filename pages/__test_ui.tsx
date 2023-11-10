import React, { useEffect, useRef, useState } from 'react';
import { Engine, Render, Runner, Body, MouseConstraint, Composite, Mouse, World, Bodies, Events } from 'matter-js';

export default function Home() {
  const containerRef = useRef(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const jsonData = {
      "proposal": "呑みに行こう",
      "emotional_patterns": {
        "挑戦欲": {
          "inner_need": "挑戦したい・成長したい",
          "requested_action": "新しいお店に一緒に挑戦してほしい",
          "relationships": "友だち"
        },
        "優越欲": {
          "inner_need": "ステータスや特権が欲しい",
          "requested_action": "高いバーに行ける金銭的余裕を羨んでほしい",
          "relationships": "部下"
        },
        "刺激欲": {
          "inner_need": "知りたい・学びたい・探求したい",
          "requested_action": "話してほしい",
          "relationships": "友だち"
        },
        "承認欲": {
          "inner_need": "愛されたい・守ってもらいたい",
          "requested_action": "性行為させてほしい",
          "relationships": "恋人"
        },
        "奉仕欲": {
          "inner_need": "誰かの役に立ちたい・応援したい",
          "requested_action": "知人の店を知ってほしい",
          "relationships": "友だち"
        },
        "自主欲": {
          "inner_need": "おいしいものを食べたい・飲みたい",
          "requested_action": "食事を一緒に食べてほしい",
          "relationships": "友だち"
        },
        "維持欲": {
          "inner_need": "悪目立ちしたくない・嫌われないように批判されないようにしたい",
          "requested_action": "周りの人間関係を教えてほしい",
          "relationships": "同僚"
        },
        "安全欲": {
          "inner_need": "ラクしたい・ラクになりたい",
          "requested_action": "悩み相談にのってほしい",
          "relationships": "友だち"
        }
      }
    };
    setData(jsonData);
  }, []);

  useEffect(() => {
    if (!data || !containerRef.current) return;

    const engine = Engine.create();
    const { world } = engine;

    // 壁を生成または再配置する関数
    var walls = [];
    function createOrUpdateWalls() {
      const pixelRatio = window.devicePixelRatio || 1;
      const frameWidth = window.innerWidth * pixelRatio;
      const frameHeight = window.innerHeight * pixelRatio;
      const wallThickness = 100 * pixelRatio; // 壁の厚さ
      const margin = wallThickness / 2;

      if (walls.length === 0) {  // 初回の場合は壁を生成
        walls.push(
          Bodies.rectangle(frameWidth / 2, -margin, frameWidth + wallThickness * 2, wallThickness, { isStatic: true }), // 上側の壁
          Bodies.rectangle(frameWidth / 2, frameHeight + margin, frameWidth + wallThickness * 2, wallThickness, { isStatic: true }), // 下側の壁
          Bodies.rectangle(-margin, frameHeight / 2, wallThickness, frameHeight + wallThickness * 2, { isStatic: true }), // 左側の壁
          Bodies.rectangle(frameWidth + margin, frameHeight / 2, wallThickness, frameHeight + wallThickness * 2, { isStatic: true }) // 右側の壁
        );
        World.add(world, walls);
      } else {  // 壁がすでに存在する場合は位置を更新
        Body.setPosition(walls[0], { x: frameWidth / 2, y: -margin });
        Body.setPosition(walls[1], { x: frameWidth / 2, y: frameHeight + margin });
        Body.setPosition(walls[2], { x: -margin, y: frameHeight / 2 });
        Body.setPosition(walls[3], { x: frameWidth + margin, y: frameHeight / 2 });
      }
    }

    // ウインドウリサイズに伴う処理
    window.addEventListener('resize', handleResize);
    function handleResize() {
      resizeCanvas();
      updateCirclePositions();
      createOrUpdateWalls();  // 壁の生成または再配置
    }
    function resizeCanvas() {
      const canvas = render.canvas;
      const pixelRatio = window.devicePixelRatio || 1;
      const width = window.innerWidth * pixelRatio;
      const height = window.innerHeight * pixelRatio;
      canvas.width = width;
      canvas.height = height;
      render.options.width = width;
      render.options.height = height;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
    }
    function updateCirclePositions() {
      const pixelRatio = window.devicePixelRatio || 1;

      // 真ん中に大きな丸を再配置
      Body.setPosition(bigCircle, {
        x: (window.innerWidth / 2) * pixelRatio,
        y: (window.innerHeight / 2) * pixelRatio
      });

      // 周囲の小さな丸を再配置
      smallCircles.forEach((smallCircle, index) => {
        const angle = (2 * Math.PI / smallCircles.length) * index;
        const distanceFromCenter = bigCircleSize + bigCircleSize / 1.5;
        const x = ((window.innerWidth / 2) + distanceFromCenter * Math.cos(angle)) * pixelRatio;
        const y = ((window.innerHeight / 2) + distanceFromCenter * Math.sin(angle)) * pixelRatio;
        Body.setPosition(smallCircle, { x, y });
      });
    }

    const render = Render.create({
      element: containerRef.current,
      engine: engine,
      options: {
        width: 800,
        height: 600,
        wireframes: false,
        background: '#fff'
      }
    });

    Render.run(render);
    Runner.run(Runner.create(), engine);

    resizeCanvas();
    createOrUpdateWalls();

    // 大きな円のサイズを設定
    const bigCircleSize = createBigCircleSize();
    function createBigCircleSize() {
      const pixelRatio = window.devicePixelRatio || 1;
      return (Math.min(window.innerWidth, window.innerHeight) / 8) * pixelRatio;
    }

    // 小さな円を生成する関数
    function createSmallCircle(x, y, radius) {
      const pixelRatio = window.devicePixelRatio || 1;
      return Bodies.circle(x * pixelRatio, y * pixelRatio, radius, {
        render: { fillStyle: 'rgba(0,0,0,.05)' } // 不透明のホワイトに設定
      });
    }

    // 大きな円や小さな円の生成の部分を関数でまとめる
    function createCircles(clickedBody = null) {
      // 真ん中に大きな丸を追加
      const pixelRatio = window.devicePixelRatio || 1;
      let bigCircleX = (window.innerWidth / 2) * pixelRatio;
      let bigCircleY = (window.innerHeight / 2) * pixelRatio;

      if (clickedBody) {
        bigCircleX = clickedBody.position.x;
        bigCircleY = clickedBody.position.y;
      }

      const bigCircle = Bodies.circle(bigCircleX, bigCircleY, bigCircleSize, {
        render: { fillStyle: 'rgba(0,0,0,.05)' }
      });
      bigCircle.isStatic = true;
      World.add(world, bigCircle);

      // 周囲に小さな丸を追加
      let smallCircles = [];
      const emotionalPatternKeys = Object.keys(data.emotional_patterns);
      for (let i = 0; i < emotionalPatternKeys.length; i++) {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        const radius = bigCircleSize / 1.5;
        const smallCircle = createSmallCircle(x, y, radius);
        smallCircles.push(smallCircle);
        World.add(world, smallCircle);
      }

      return [bigCircle, smallCircles];
    }

    // テキストの表示部分を関数でまとめる
    function renderTexts(bigCircle, smallCircles) {
      const ctx = render.context;

      // 小さな円のテキストをレンダリング
      for (let i = 0; i < smallCircles.length; i++) {
        const smallCircle = smallCircles[i];
        const emotionalPatternKeys = Object.keys(data.emotional_patterns);
        const patternKey = emotionalPatternKeys[i];
        const text = data.emotional_patterns[patternKey].requested_action;
        ctx.fillStyle = "#000";
        ctx.font = "18px Arial";
        const textMetrics = ctx.measureText(text);
        ctx.fillText(text, smallCircle.position.x - textMetrics.width / 2, smallCircle.position.y + 10);
      }

      // 大きな円のテキストをレンダリング
      const bigCircleText = data.proposal;
      const textMetrics = ctx.measureText(bigCircleText);
      ctx.fillText(bigCircleText, bigCircle.position.x - textMetrics.width / 2, bigCircle.position.y + 10);
    }


    // マウスで物体を操作するための制約を追加
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse: Mouse.create(render.canvas)
    });
    World.add(world, mouseConstraint);

    let [bigCircle, smallCircles] = createCircles();

    // クリックイベントを追加
    Events.on(mouseConstraint, 'mousedown', function (event) {
      const clickedBody = event.source.body;
      if (!clickedBody) return;

      if (!clickedBody.isStatic && clickedBody !== bigCircle) {
        // 他の円と大きな円を削除
        Composite.remove(world, bigCircle);
        for (let i = 0; i < smallCircles.length; i++) {
          Composite.remove(world, smallCircles[i]);
        }

        [bigCircle, smallCircles] = createCircles(clickedBody);
      }
    });

    // 重力を中心の大きな丸に向ける
    engine.world.gravity.scale = 0; // デフォルトの重力を無効化
    engine.world.gravity.x = 1; // 右に向ける
    engine.world.gravity.y = 0;

    Events.on(engine, 'afterUpdate', function () {
      for (let i = 0; i < engine.world.bodies.length; i++) {
        const body = engine.world.bodies[i];

        // 重力の強さを計算
        const rotationForceMagnitude = 0.000001 * body.mass; // 右回転の力の強さ
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

        // テキストのレンダリング
        renderTexts(bigCircle, smallCircles);

      }
    });

    // Cleanup to prevent memory leaks
    return () => {
      Render.stop(render);
      Runner.stop(Runner.create());
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('resize', handleResize);
      Events.off(engine);
      if (render.canvas) {
        render.canvas.remove();
      }
    }

  }, [data]);

  return (
    <>
      <div ref={containerRef}></div>
    </>
  );
}