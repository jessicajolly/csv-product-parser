import { useState } from 'react';
import './App.css';
import Papa from 'papaparse';

function App() {
  const [baseFile, setBaseFile] = useState(null);
  const [updateFile, setUpdateFile] = useState(null);
  const [data, setData] = useState({});        // key = SKU, value = row
  const [updatedSkus, setUpdatedSkus] = useState(new Set());
  const [uploadedFileName, setUploadedFileName] = useState('');
  
  const normalize = (str) => str?.toString().replace(/\(.*?\)/g, '').trim().toLowerCase();

  // --- Step 1: Upload base CSV ---
  const handleBaseFile = (e) => setBaseFile(e.target.files[0]);

  const importBaseCSV = () => {
    if (!baseFile) return;

    Papa.parse(baseFile, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        const formatted = {};

        results.data.forEach(row => {
          const skuKey = normalize(row['oem_sku']);
          const stockValue = Number(row['stock_quantity'] || 0);

          if (formatted[skuKey]) {
            // IF THERE IS A DUPLICATE SKU, TOTAL THE STOCK AND MERGE TO ONE LINE
            formatted[skuKey]['stock_quantity'] =
              Number(formatted[skuKey]['stock_quantity'] || 0) + stockValue;
          } else {
            // first occurence
            formatted[skuKey] = { ...row };
          }
        });

        setData(formatted);
        setUploadedFileName('Products uploaded'); 
        setUpdatedSkus(new Set()); 
      }
    });
  };

  // --- Step 2: Upload update CSV ---
  const handleUpdateFile = (e) => setUpdateFile(e.target.files[0]);

  const importUpdateCSV = () => {
    if (!updateFile) return;

    setUploadedFileName(updateFile.name);

    Papa.parse(updateFile, {
      header: true,
      skipEmptyLines: true,
      transformHeader: header => header.trim().toLowerCase(),
      complete: function(results) {
        const changed = new Set();

        setData(prevData => {
          const updated = { ...prevData };

          results.data.forEach(row => {
            const skuKey = normalize(row['oem_sku']);
            const stockValue = Number(row['stock_quantity'] || 0);

            if (updated[skuKey] && stockValue > 0) {
              // ADD stock to existing amount
              updated[skuKey]['stock_quantity'] =
                Number(updated[skuKey]['stock_quantity'] || 0) + stockValue;

              // Update price if defined and item in stock
              if (row['price'] && stockValue > 0) {
                updated[skuKey]['price'] = row['price'];
              }

              changed.add(skuKey); // highlight updated rows
            }
          });

          setUpdatedSkus(changed);
          return updated;
        });
      }
    });
  };

  // Preview updated rows, max 100
  const previewRows = Object.values(data)
    .filter(row => updatedSkus.has(normalize(row['oem_sku'])))
    .slice(0, 100);

  // Export full CSV
  const exportCSV = () => {
    const csv = Papa.unparse(Object.values(data));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'merged_full_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="App">
      <h1>CSV Product Updater</h1>
      <p>This parser takes the product sheet from the GWS exporter and merges multiple lines of the same SKU onto 1 line, adding together the stock. <br/>Then, once uploading a csv from another supplier, stock is added matching SKUs and, if set, the price is updated to the new amount.<br/>
      The column headers in the update file must match the column names below: oem_sku, stock_quantity, price. This is case sensitive.</p>
      <p>SKU sanitization. Currently, anything in parenthesis () added to the end of the SKU by the new supplier will be removed by the parser. So an SKU of <b>1234579(bro-man)</b> with have the (bro-man) removed, leaving <b>1234579</b> as the matching sku. Any other formatting or name changing by the supplier needs to be sanitized out before uploading.</p>
      <p>You can repeat step 2 as many times as you like. Once all new csvs have been uploading, you download the final CSV in step 3.</p>
      <div class="content">
		  <div>
			  <h2>Step 1: Upload base CSV</h2>
			  <input type="file" onChange={handleBaseFile} />
			  <button onClick={importBaseCSV}>Upload Base CSV</button>
			  {uploadedFileName && <p>{uploadedFileName}</p>}
			
			  <h2>Step 2: Upload update CSV</h2>
			  <input type="file" onChange={handleUpdateFile} disabled={!uploadedFileName}  />
			  <button onClick={importUpdateCSV} disabled={!uploadedFileName} >Upload Update CSV</button>
	
			  {updatedSkus.size > 0 && (
				<p>{updatedSkus.size} products updated</p>
			  )}
	  
	
				<h2>Step 3: Export merged CSV</h2>
				<button onClick={exportCSV}>Export Full CSV</button>
		  </div>
		  
		  <div>
			  
			  <h2>Preview</h2>
			  <p>First 100 rows after update file is uploaded.</p>

				  <table border="1" cellPadding="4">
					<thead>
					  <tr>
						<th>oem_sku</th>
						<th>stock_quantity</th>
						<th>price</th>
					  </tr>
					</thead>
					<tbody>
					  {previewRows.map((row, i) => (
						<tr key={i} style={{ backgroundColor: '#d4f8d4' }}>
						  <td>{row['oem_sku']}</td>
						  <td>{row['stock_quantity']}</td>
						  <td>{row['price']}</td>
						</tr>
					  ))}
					</tbody>
				  </table>
		  </div>
      </div>
    </div>
  );
}

export default App;