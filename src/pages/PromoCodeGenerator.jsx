import React, { useState } from "react";

const PromoCodeGenerator = () => {
  const [discount, setDiscount] = useState(90);
  const [quantity, setQuantity] = useState(20);
  const [codes, setCodes] = useState([]);

  const generateCodes = () => {
    const newCodes = [];
    for (let i = 0; i < quantity; i++) {
      newCodes.push('SJGD1317' + Math.random().toString(36).substr(2, 6).toUpperCase());
    }
    setCodes(newCodes);
  };

  return (
    <div className="promo-code-generator">
      <h2>Promo Code Generator</h2>
      <div className="controls">
        <label>Discount rate: </label>
        <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        <label>Quantity: </label>
        <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <button onClick={generateCodes}>Generate</button>
      </div>
      <div className="codes">
        {codes.map((code, index) => (
          <div key={index}>
            <span>{code}</span>
            <button>Copy</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PromoCodeGenerator;
