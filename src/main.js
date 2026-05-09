import { scaleFactor, dialogueData} from "./constants";
import { k } from "./kaboomCtx";
import { setCamScale, displayDialogue } from "./utils";

k.loadSprite("spritesheet", "./spritesheet.png", 
    {
        sliceX: 39,
        sliceY: 31,
        anims: {
            "idle-down": 936,
            "walk-down": { from: 936, to: 939, loop: true, speed: 8 },
            "idle-side": 975,
            "walk-side": { from: 975, to: 978, loop: true, speed: 8 },
            "idle-up": 1014,
            "walk-up": { from: 1014, to: 1017, loop: true, speed: 8 },
        },


} )

k.loadSprite("map", "./map.png");

k.setBackground(k.Color.fromHex("#311047"));

k.scene("main", async() => {
    const mapData = await (await fetch("./map.json")).json()
    const layers = mapData.layers;

    const map = k.add([
        k.sprite("map"),
        k.pos(0),
        k.scale(scaleFactor)
    ]);

    const player = k.make([
        k.sprite("spritesheet", {anim: "idle-down"}), 
        k.area({shape: new k.Rect(k.vec2(0, 3), 10, 10)}),
        k.body(),
        k.anchor("center"),
        k.pos(),
        k.scale(scaleFactor),
        {
            speed: 250,
            direction: "down",
            isInDialogue: false,
        },
        "player", //Helps identify game object, ex in a collision
    ])


    
    let nearbyTarget = null;

    for (const layer of layers) {
        //Hocus Pocus for boundaries
        if (layer.name === "boundaries") {
          for (const boundary of layer.objects) {
            map.add([
              k.area({
                shape: new k.Rect(k.vec2(0), boundary.width, boundary.height),
              }),
              k.body({ isStatic: true }),
              k.pos(boundary.x, boundary.y),
              boundary.name,
            ]);

            if (boundary.name && dialogueData[boundary.name]) {
              const cx = (boundary.x + boundary.width / 2) * scaleFactor;
              const cy = (boundary.y + boundary.height / 2) * scaleFactor;
              player.onCollide(boundary.name, () => {
                nearbyTarget = { name: boundary.name, cx, cy };
              });
              player.onCollideEnd(boundary.name, () => {
                if (nearbyTarget && nearbyTarget.name === boundary.name) {
                  nearbyTarget = null;
                }
              });
            }
          }

          continue;
        }
        //Hocus Pocus for spawnpoint
        if (layer.name === "spawnpoints") {
            for (const entity of layer.objects) {
              if (entity.name === "player") {
                player.pos = k.vec2(
                  (map.pos.x + entity.x) * scaleFactor,
                  (map.pos.y + entity.y) * scaleFactor
                );
                k.add(player);
                continue;
              }
            }
          }
        }


    setCamScale(k);

    k.onResize(() => {
        setCamScale(k);
    });

    const interactPrompt = document.getElementById("interact-prompt");

    function isFacingTarget() {
      if (!nearbyTarget) return false;
      const dx = nearbyTarget.cx - player.pos.x;
      const dy = nearbyTarget.cy - player.pos.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        return (dx > 0 && player.direction === "right") ||
               (dx < 0 && player.direction === "left");
      }
      return (dy > 0 && player.direction === "down") ||
             (dy < 0 && player.direction === "up");
    }

    k.onUpdate(() => {
        k.camPos(player.pos.x, player.pos.y + 100);
        const show = !player.isInDialogue && isFacingTarget();
        interactPrompt.style.display = show ? "block" : "none";
    });

    k.onKeyPress("enter", () => {
      if (player.isInDialogue) {
        document.getElementById("close").click();
        return;
      }
      if (!isFacingTarget()) return;
      const name = nearbyTarget.name;
      player.isInDialogue = true;
      interactPrompt.style.display = "none";
      displayDialogue(
        dialogueData[name],
        () => (player.isInDialogue = false)
      );
    });

    k.onMouseDown((mouseBtn) => {
        if (mouseBtn !== "left" || player.isInDialogue) return;
    
        const worldMousePos = k.toWorld(k.mousePos());
        player.moveTo(worldMousePos, player.speed);
    
        const mouseAngle = player.pos.angle(worldMousePos);
    
        const lowerBound = 50;
        const upperBound = 125;
    
        if (
          mouseAngle > lowerBound &&
          mouseAngle < upperBound &&
          player.curAnim() !== "walk-up"
        ) {
          player.play("walk-up");
          player.direction = "up";
          return;
        }
    
        if (
          mouseAngle < -lowerBound &&
          mouseAngle > -upperBound &&
          player.curAnim() !== "walk-down"
        ) {
          player.play("walk-down");
          player.direction = "down";
          return;
        }
    
        if (Math.abs(mouseAngle) > upperBound) {
          player.flipX = false;
          if (player.curAnim() !== "walk-side") player.play("walk-side");
          player.direction = "right";
          return;
        }
    
        if (Math.abs(mouseAngle) < lowerBound) {
          player.flipX = true;
          if (player.curAnim() !== "walk-side") player.play("walk-side");
          player.direction = "left";
          return;
        }
      });

    
  function stopAnims() {
    if (player.direction === "down") {
      player.play("idle-down");
      return;
    }
    if (player.direction === "up") {
      player.play("idle-up");
      return;
    }

    player.play("idle-side");
  }

  k.onMouseRelease(stopAnims);

  k.onKeyRelease(() => {
    stopAnims();
  });

  k.onKeyDown((key) => {
    const keyMap = [
      k.isKeyDown("right"),
      k.isKeyDown("left"),
      k.isKeyDown("up"),
      k.isKeyDown("down"),
    ];

    let nbOfKeyPressed = 0;
    for (const key of keyMap) {
      if (key) {
        nbOfKeyPressed++;
      }
    }

    if (nbOfKeyPressed > 1) return;

    if (player.isInDialogue) return;
    if (keyMap[0]) {
      player.flipX = false;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "right";
      player.move(player.speed, 0);
      return;
    }

    if (keyMap[1]) {
      player.flipX = true;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "left";
      player.move(-player.speed, 0);
      return;
    }

    if (keyMap[2]) {
      if (player.curAnim() !== "walk-up") player.play("walk-up");
      player.direction = "up";
      player.move(0, -player.speed);
      return;
    }

    if (keyMap[3]) {
      if (player.curAnim() !== "walk-down") player.play("walk-down");
      player.direction = "down";
      player.move(0, player.speed);
    }
  });
});

k.go("main");