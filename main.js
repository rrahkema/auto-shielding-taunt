const MODULE = "auto-shielding-taunt";
const TAUNT_EFFECT = "Compendium.pf2e.feat-effects.Item.FlyWq9znOHvpISNW";
const SHIELD_EFFECT = "Compendium.pf2e.equipment-effects.Item.2YgXoHvJfrDHucMr";
let socket;

async function addEffect(actor, uuid) {
  if (!actor) return;
  if (actor.items.some(i => (i._stats?.compendiumSource ?? i.sourceId) === uuid)) return;
  const src = (await fromUuid(uuid))?.toObject();
  if (src) await actor.createEmbeddedDocuments("Item", [src]);
}

Hooks.once("socketlib.ready", () => {
  socket = socketlib.registerModule(MODULE);
  // Runs on the GM's client
  socket.register("applyTaunt", async (uuid) => addEffect(await fromUuid(uuid), TAUNT_EFFECT));
});

Hooks.on("createChatMessage", async (msg) => {
  if (msg.author?.id !== game.user.id) return;      // only the user who used the feat acts
  const origin = msg.flags?.pf2e?.origin;
  if (!origin?.uuid) return;

  const item = await fromUuid(origin.uuid);
  if (item?.slug !== "shielding-taunt") return;

  const guardian = item.actor;
  const target = game.user.targets.first()?.actor;

  await addEffect(guardian, SHIELD_EFFECT);          // player owns their own actor
  if (target) await socket.executeAsGM("applyTaunt", target.uuid);
  else ui.notifications.warn("Shielding Taunt: no target selected.");
});
