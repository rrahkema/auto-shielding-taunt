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

function tokenLabel(t) {
  if (!game.user.isGM && t.document.playersCanSeeName === false) return "Unknown creature";
  return t.name;
}

// Radio buttons when limit is 1, capped checkboxes otherwise. Returns chosen tokens or null/[] on cancel.
async function chooseTargets(tokens, limit) {
  const single = limit === 1;
  const type = single ? "radio" : "checkbox";

  const rows = tokens.map((t, i) => `
    <label class="stm-row" data-i="${i}" style="display:flex;align-items:center;gap:8px;margin:4px 0;cursor:pointer">
      <input type="${type}" name="t" value="${i}">
      <img src="${t.document.texture.src}" width="36" height="36" style="object-fit:contain;border:none">
      <span>${tokenLabel(t)}</span>
    </label>`).join("");

  return foundry.applications.api.DialogV2.prompt({
    window: { title: single ? "Taunt target" : `Taunt targets (max ${limit})` },
    content: `<p>${single ? "Pick one." : `Tick up to ${limit}.`} Hover a row to ping the token.</p>${rows}`,
    ok: {
      label: "Taunt",
      callback: (event, button) =>
        [...button.form.querySelectorAll("input[name=t]:checked")].map(e => tokens[Number(e.value)])
    },
    render: (event, dialog) => {
      const el = dialog.element;
      const okBtn = el.querySelector('button[data-action="ok"]');
      const inputs = [...el.querySelectorAll("input[name=t]")];

      const update = () => {
        const n = inputs.filter(i => i.checked).length;
        if (okBtn) okBtn.disabled = n < 1 || n > limit;
        if (!single) inputs.forEach(i => { i.disabled = !i.checked && n >= limit; });
      };
      inputs.forEach(i => i.addEventListener("change", update));

      el.querySelectorAll(".stm-row").forEach(row =>
        row.addEventListener("mouseenter", () => canvas.ping(tokens[Number(row.dataset.i)].center)));

      update();
    },
    rejectClose: false
  });
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
  const tokens = [...game.user.targets].filter(t => t.actor);

  // Over the limit: ask first. Cancelling the dialog cancels everything.
  let chosen = tokens;
  if (tokens.length > limit) {
    chosen = await chooseTargets(tokens, limit);
    if (!chosen?.length) return ui.notifications.info("Shielding Taunt cancelled: no effects applied.");
  }

  await addEffect(guardian, SHIELD_EFFECT);

  if (!chosen.length) {
    return ui.notifications.warn("Shielding Taunt: no target selected. Only Raise a Shield applied.");
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

  await socket.executeAsGM("applyTaunt", guardian.uuid, chosen.map(t => t.actor.uuid), limit, ctx);
});
