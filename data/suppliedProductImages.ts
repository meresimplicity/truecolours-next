export type SuppliedProductImage = {
  id: string;
  src: string;
  featured: boolean;
};

// Latest product artwork supplied for the TRUECOLOURS catalogue. The source
// filenames are retained so these assets remain traceable to the supplied set.
const suppliedProductImageFiles = [
  "05992988-D7D3-46BE-9E60-B1AA84CEE9DF.PNG",
  "0F918FFC-8106-4510-8162-F59A4C7C2853.PNG",
  "11CED917-8416-420D-87F1-5A2E79D16277.PNG",
  "1B3D0EB6-7357-4D1A-B0A6-B8D6ECAAFD88.PNG",
  "2B1ED676-7404-4EAB-954D-90A431DE90AC.PNG",
  "30ADB8CC-9B08-46B4-A0EC-BD0C344F7A0D.PNG",
  "3A11E390-792A-4F60-B07F-186884F67CA5.PNG",
  "442D9C9E-6F9D-48C9-9F38-E3BA04A400F1.PNG",
  "47B63864-25D8-4DFD-97EA-77C9A69FFB2E.PNG",
  "4BCBC07A-B47F-43B3-A4E9-84F5276BD8B9.PNG",
  "4CE76260-AA77-4397-A731-139D29A8675C.PNG",
  "55644AE9-0ECB-427C-B07F-94B45DA4A843.PNG",
  "5C8749CF-E937-40D9-97BC-A9F1DD048624.PNG",
  "62139383-59B8-48B4-A0B1-AD94403EF13E.PNG",
  "6317507A-FFBD-4417-8FE3-B843FCE203D0.PNG",
  "8878A88E-88DB-4275-92DE-BD98E94EDBF9.PNG",
  "942C20A0-B632-4667-8C75-B458293AD57E.PNG",
  "971EECE7-20B6-47E6-9665-E53A06F76F06.PNG",
  "AAD137CE-D713-4B6D-8986-C1BCFE8D19CD.PNG",
  "AB88BFE8-FCBD-42A0-A709-512B64DC742D.PNG",
  "AD962316-7F1E-450E-B84C-DA70AAA3BA75.PNG",
  "B5DBA03A-0051-4979-AD8D-C41CC05037DB.PNG",
  "BAF37EBA-76A4-4346-ACBD-5FC4D8CBDB9B.PNG",
  "C9A537AA-BB59-4AB1-8A22-83D0C305546D.PNG",
  "DA4219D3-A167-4D2E-927F-5EAE039163DD.PNG",
  "E13C00B2-F1E2-4F38-BCB1-FFF21CE46AF9.PNG",
  "E63F2589-539C-44B2-A8C8-A2302B118B5E.PNG",
  "ECDFEE5A-EA66-4C4D-B28C-A412C678B2FC.PNG",
  "EF098E9F-4416-4903-A7E2-0FA047C2613D.PNG",
  "F2005557-C5CF-49A2-9B8D-4B9A054803C9.PNG",
  "FE04CAB2-B3B2-46A8-8EB7-98B19AB545B3.PNG",
] as const;

const generatedProductImageFiles = [
  "ChatGPT Image Aug 17, 2026, 11_17_08 PM (1).png",
  "ChatGPT Image Aug 17, 2026, 11_17_09 PM (2).png",
  "ChatGPT Image Aug 17, 2026, 11_17_10 PM (3).png",
  "ChatGPT Image Aug 17, 2026, 11_17_10 PM (4).png",
  "ChatGPT Image Aug 17, 2026, 11_17_10 PM (5).png",
  "ChatGPT Image Aug 17, 2026, 11_17_11 PM (6).png",
  "ChatGPT Image Aug 17, 2026, 11_17_11 PM (7).png",
  "ChatGPT Image Aug 17, 2026, 11_17_12 PM (8).png",
  "ChatGPT Image Aug 17, 2026, 11_17_12 PM (9).png",
  "ChatGPT Image Aug 17, 2026, 11_17_13 PM (10).png",
  "ChatGPT Image Aug 17, 2026, 11_20_15 PM (1).png",
  "ChatGPT Image Aug 17, 2026, 11_20_16 PM (2).png",
  "ChatGPT Image Aug 17, 2026, 11_20_16 PM (3).png",
  "ChatGPT Image Aug 17, 2026, 11_20_16 PM (4).png",
  "ChatGPT Image Aug 17, 2026, 11_20_16 PM (5).png",
  "ChatGPT Image Aug 17, 2026, 11_20_17 PM (6).png",
  "ChatGPT Image Aug 17, 2026, 11_20_17 PM (7).png",
  "ChatGPT Image Aug 17, 2026, 11_20_18 PM (8).png",
  "ChatGPT Image Aug 17, 2026, 11_20_19 PM (9).png",
  "ChatGPT Image Aug 17, 2026, 11_20_19 PM (10).png",
  "ChatGPT Image Aug 17, 2026, 11_31_20 PM (1).png",
  "ChatGPT Image Aug 17, 2026, 11_31_21 PM (2).png",
  "ChatGPT Image Aug 17, 2026, 11_31_21 PM (3).png",
  "ChatGPT Image Aug 17, 2026, 11_31_22 PM (4).png",
  "ChatGPT Image Aug 17, 2026, 11_31_22 PM (5).png",
  "ChatGPT Image Aug 17, 2026, 11_31_22 PM (6).png",
  "ChatGPT Image Aug 17, 2026, 11_31_23 PM (7).png",
  "ChatGPT Image Aug 17, 2026, 11_31_23 PM (8).png",
  "ChatGPT Image Aug 17, 2026, 11_31_24 PM (9).png",
  "ChatGPT Image Aug 17, 2026, 11_31_24 PM (10).png",
] as const;

export const suppliedProductImages: SuppliedProductImage[] = [
  ...suppliedProductImageFiles,
  ...generatedProductImageFiles,
].map(
  (file, index) => ({
    id: `supplied-product-image-${index + 1}`,
    src: `/products/${file}`,
    featured: index < 12,
  })
);
