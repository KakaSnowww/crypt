type AlchemicalLivingSceneProps = {
  compact?: boolean;
};

export function AlchemicalLivingScene({ compact = false }: AlchemicalLivingSceneProps) {
  return (
    <div
      aria-hidden="true"
      className={`living-alchemy${compact ? ' living-alchemy--compact' : ''}`}
    >
      <div className="living-alchemy__depth living-alchemy__depth--far" />
      <div className="living-alchemy__mist" />
      <div className="living-alchemy__orbit">
        <span />
        <span />
        <span />
      </div>
      <img className="living-alchemy__books3d" src="/art/crypt-books-3d-v4.webp" alt="" />
      <div className="living-alchemy__potion3d">
        <span className="living-alchemy__potion-glow" />
        <img src="/art/crypt-potions-3d-v4.webp" alt="" />
        <span className="living-alchemy__bubble living-alchemy__bubble--one" />
        <span className="living-alchemy__bubble living-alchemy__bubble--two" />
        <span className="living-alchemy__bubble living-alchemy__bubble--three" />
      </div>
      <div className="living-alchemy__embers" />
    </div>
  );
}
