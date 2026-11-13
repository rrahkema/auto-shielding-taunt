const MODULE = "auto-shielding-taunt";
const TAUNT_EFFECT = "Compendium.pf2e.feat-effects.Item.FlyWq9znOHvpISNW";
const SHIELD_EFFECT = "Compendium.pf2e.equipment-effects.Item.2YgXoHvJfrDHucMr";
let socket;

const hasSource = (actor, uuid) =>
  actor.items.some(i => (i._stats?.compendiumSource ?? i.sourceId) === uuid);

async function addEffect(actor, uuid, flags, ctx) {
  if (!actor || hasSource(actor, uuid)) return;
  const src = (await fromUuid(uuid))?.toObject();
  if (!src) return;
  if (flags) { src.flags ??= {}; src.flags[MODULE] = flags; }
  if (ctx) {
    src.system.start = { value: game.time.worldTime, initiative: ctx.initiative };
    src.system.context = { origin: ctx.origin, target: null, roll: null };
  }
  await actor.createEmbeddedDocuments("Item", [src]);
}

Hooks.once("socketlib.ready", () => {
  socket = socketlib.registerModule(MODULE);

  // Runs on the GM's client
  socket.register("applyTaunt", async (guardianUuid, targetUuids, limit, ctx) => {
    const targets = (await Promise.all(targetUuids.map(u => fromUuid(u)))).filter(Boolean);

    // Taunt effects this guardian already has out, on enemies not in the new target list
    const newIds = new Set(targets.map(a => a.uuid));
    const old = [];
    for (const tok of canvas.scene?.tokens ?? []) {
      const a = tok.actor;
      if (!a || newIds.has(a.uuid)) continue;
      for (const e of a.itemTypes.effect) {
        if (e.flags?.[MODULE]?.guardian === guardianUuid) old.push(e);
      }
    }

    // Keep the most recent old ones that still fit under the limit, remove the rest
    old.sort((x, y) => (y.flags[MODULE].at ?? 0) - (x.flags[MODULE].at ?? 0));
    const room = Math.max(0, limit - targets.length);
    for (const e of old.slice(room)) await e.delete();

    for (const a of targets) {
      await addEffect(a, TAUNT_EFFECT, { guardian: guardianUuid, at: Date.now() }, ctx);
    }
  });
});

Hooks.on("createChatMessage", async (msg) => {
  if (msg.author?.id !== game.user.id) return;
  const origin = msg.flags?.pf2e?.origin;
  if (!origin?.uuid) return;

  const item = await fromUuid(origin.uuid);
  if (item?.slug !== "shielding-taunt") return;

  const guardian = item.actor;
  if (!guardian) return;

  const limit = guardian.itemTypes.feat.some(f => f.slug === "group-taunt") ? 3 : 1;
  let targets = [...game.user.targets].map(t => t.actor).filter(Boolean);

  await addEffect(guardian, SHIELD_EFFECT);

  if (!targets.length) return ui.notifications.warn("Shielding Taunt: no target selected.");
  if (targets.length > limit) {
    ui.notifications.warn(`Shielding Taunt: you can Taunt up to ${limit}. Using the first ${limit} targets.`);
    targets = targets.slice(0, limit);
  }

  // Context so Taunt expires at the start of the Guardian's turn
  const token = guardian.getActiveTokens()[0]?.document;
  const combatant = game.combat?.combatants.find(c => c.actorId === guardian.id);
  const ctx = {
    initiative: combatant?.initiative ?? null,
    origin: {
      actor: guardian.uuid,
      token: token?.uuid ?? null,
      item: item.uuid,
      spellcasting: null,
      rollOptions: origin.rollOptions
    }
  };
  if (ctx.initiative == null) {
    ui.notifications.warn("Shielding Taunt: Guardian has no initiative, so Taunt will expire at the start of the round.");
  }

  await socket.executeAsGM("applyTaunt", guardian.uuid, targets.map(a => a.uuid), limit, ctx);
});
