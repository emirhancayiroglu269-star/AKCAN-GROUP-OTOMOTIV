import React from "react";
import { Buton, Girdi, Secim, Kart } from "../src/components/ui";
export function X() {
  return (
    <>
      <Buton onClick={() => {}}>A</Buton>
      <Girdi label="a" value="b" onChange={() => {}} type="text" />
      <Secim label="a" value="b" onChange={() => {}}><option>1</option></Secim>
      <Kart key="k" className="c">x</Kart>
    </>
  );
}
