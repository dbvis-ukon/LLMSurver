
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  Chip,
} from "@heroui/react";
import { FaTriangleExclamation} from "react-icons/fa6";
import { useEffect, useState } from "react";
import * as Types from "Types";

interface Props {
  papers: Types.Paper[];
}

export default function Papers({ papers }: Props) {
  const [tableColumns, setTableColumns] = useState<string[]>([""]);
  const [models, setModels] = useState<string[]>([""]);
  const [tableRows, setTableRows] = useState<React.JSX.Element[]>([]);

  useEffect(() => {
    const model_map = new Map();

    if (!papers || papers.length < 1) {
      setTableColumns([""]);
      return;
    }

    // Table Columns
    let columns = Object.keys(papers[0]).filter(
      (key) =>
        key !== "paper_id" &&
        key !== "abstract" &&
        key !== "model_responses" &&
        key !== "consensus"
    );

    papers.forEach((p) => {
      if (p.model_responses && p.model_responses.length > 0) {
        p.model_responses.forEach((r) => {
          model_map.set(r.model_name, true);
        });
      }
    });

    const mod = Array.from(model_map.keys()) as string[];
    columns = columns.concat(mod);
    columns = columns.concat(
      papers[0].consensus !== undefined ? ["consensus"] : []
    );
    setModels(mod);
    setTableColumns(columns);

    // Table Rows
    const getCellValue = (paper: Types.Paper, col: string) => {
      if (
        (models.includes(col) && paper.model_responses) ||
        (col === "consensus" && paper.consensus !== undefined)
      ) {
        let val = 0;
        let resp = undefined;
        if (col === "consensus" && paper.consensus !== undefined) {
          val = paper.consensus;
        } else {
          resp = paper.model_responses!.find((v) => {
            return v.model_name === col;
          });

          if (resp !== undefined) val = resp.classification;
        }
        return (
          <Tooltip
            showArrow={true}
            content={resp !== undefined ? resp.answer : ""}
            isDisabled={resp === undefined}
          >
            <Chip
              variant="solid"
              color={
                val === 1
                  ? "success"
                  : val === 2
                    ? "danger"
                    : val === 3
                      ? "warning"
                      : "default"
              }
              // Consensus chip is made larger
              size={col === "consensus" ? "lg" : "sm"}
            >
              {val === 1
                ? "include"
                : val === 2
                  ? "discard"
                  : val === 3
                    ? "error"
                    : "default"}
            </Chip>
          </Tooltip>
        );
      }
      // DOI is linked to the paper website
      else if (col == "doi") {
        return (
          <a
            href={`https://doi.org/${paper.doi}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {paper.doi}
          </a>
        );
      }
      // When hovering the title, the abstract can be viewed
      else if (col == "document_title") {
        return (
          <Tooltip
            showArrow={true}
            content={
              <div className="px-1 py-2">
                <div className="text-small font-bold">Abstract</div>
                <div className="text-tiny">{paper.abstract.trim() == '' ? 'WARNING: No abstract supplied, classification will not work properly': paper.abstract}</div>
              </div>
            }
          >
            <span>{paper.document_title}{paper.abstract.trim() == '' ?  <FaTriangleExclamation style={{marginLeft: "5px", color: "#e7c445", display: 'inline', verticalAlign: 'top'}} /> : <></>}</span>
          </Tooltip>
        );
      }
      return <>{(paper as any)[col]}</>;
    };

    const rows = papers.map((paper, id) => (
      <TableRow key={id}>
        {columns.map((col, col_id) => (
          <TableCell key={"paper" + id + "," + col_id} style={paper.abstract.trim() == '' ? {background: '#362c00'} : {}}>
            {getCellValue(paper, col)}
          </TableCell>
        ))}
      </TableRow>
    ));

    setTableRows(rows);
  }, [papers]);

  return papers.length > 0 && tableColumns.length > 1 ? (
    <div style={{ overflowY: "auto", flexGrow: 1, height: "100%" }}>
      <Table
        isStriped 
        aria-label="Papers Classification Table"
        style={{
          height: "auto",
          minWidth: "100%",
        }}
      >
        <TableHeader>
          {tableColumns.map((key, id) => (
            <TableColumn
              key={"column" + id}
              style={
                models.includes(key)
                  ? { writingMode: "vertical-rl", textAlign: "center" }
                  : key === "consensus"
                    ? { textAlign: "center" }
                    : {}
              }
            >
              {models.includes(key) ? (
                <Tooltip showArrow={true} content={key}>
                  <span className="llmLabel">{key}</span>
                </Tooltip>
              ) : (
                key
                  .split("_")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")
              )}
            </TableColumn>
          ))}
        </TableHeader>
        <TableBody>{tableRows}</TableBody>
      </Table>
    </div>
  ) : (
    <>
    <div style={{marginLeft: 'auto', marginRight: 'auto'}}>
      <svg width="184" height="152" viewBox="0 0 184 152" xmlns="http://www.w3.org/2000/svg">
      <title>No data</title>
      <g fill="none" fillRule="evenodd">
        <g transform="translate(24 31.67)">
          <ellipse fillOpacity=".8" fill="#4f4f4fff" cx="67.797" cy="106.89" rx="67.797" ry="12.668"></ellipse>
          <path d="M122.034 69.674L98.109 40.229c-1.148-1.386-2.826-2.225-4.593-2.225h-51.44c-1.766 0-3.444.839-4.592 2.225L13.56 69.674v15.383h108.475V69.674z" fill="#676767ff"></path>
          <path d="M101.537 86.214L80.63 61.102c-1.001-1.207-2.507-1.867-4.048-1.867H31.724c-1.54 0-3.047.66-4.048 1.867L6.769 86.214v13.792h94.768V86.214z" fill="url(#linearGradient-1)" transform="translate(13.56)"></path>
          <path d="M33.83 0h67.933a4 4 0 0 1 4 4v93.344a4 4 0 0 1-4 4H33.83a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill="#dededeff"></path>
          <path d="M42.678 9.953h50.237a2 2 0 0 1 2 2V36.91a2 2 0 0 1-2 2H42.678a2 2 0 0 1-2-2V11.953a2 2 0 0 1 2-2zM42.94 49.767h49.713a2.262 2.262 0 1 1 0 4.524H42.94a2.262 2.262 0 0 1 0-4.524zM42.94 61.53h49.713a2.262 2.262 0 1 1 0 4.525H42.94a2.262 2.262 0 0 1 0-4.525zM121.813 105.032c-.775 3.071-3.497 5.36-6.735 5.36H20.515c-3.238 0-5.96-2.29-6.734-5.36a7.309 7.309 0 0 1-.222-1.79V69.675h26.318c2.907 0 5.25 2.448 5.25 5.42v.04c0 2.971 2.37 5.37 5.277 5.37h34.785c2.907 0 5.277-2.421 5.277-5.393V75.1c0-2.972 2.343-5.426 5.25-5.426h26.318v33.569c0 .617-.077 1.216-.221 1.789z" fill="#676767ff"></path>
        </g>
        <path d="M149.121 33.292l-6.83 2.65a1 1 0 0 1-1.317-1.23l1.937-6.207c-2.589-2.944-4.109-6.534-4.109-10.408C138.802 8.102 148.92 0 161.402 0 173.881 0 184 8.102 184 18.097c0 9.995-10.118 18.097-22.599 18.097-4.528 0-8.744-1.066-12.28-2.902z" fill="#676767ff"></path>
        <g transform="translate(149.65 15.383)" fill="#a2a2a2ff">
          <ellipse cx="20.654" cy="3.167" rx="2.849" ry="2.815"></ellipse>
          <path d="M5.698 5.63H0L2.898.704zM9.259.704h4.985V5.63H9.259z"></path>
        </g>
      </g>
      </svg>
    </div>
    <center><span style={{color: '#cccccc'}}>No data available</span></center>
    </>
  );
}
