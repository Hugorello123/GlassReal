
export default function OilBox() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="text-sm opacity-70 mb-1">OIL (WTI)</div>
      <div className="h-40 w-full">
        <iframe
          src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_oil&symbol=TVC%3AUSOIL&interval=60&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&hideideas=1&theme=dark"
          style={{ border: "none" }}
          width="100%"
          height="100%"
          allowTransparency={true}
          scrolling="no"
        ></iframe>
      </div>
    </div>
  );
}
