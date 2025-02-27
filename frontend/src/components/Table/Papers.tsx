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
import { useEffect, useState } from "react";
import * as Types from "Types";

interface Props {
  papers: Types.Paper[];
}

export default function Papers({ papers }: Props) {
  const [tableColumns, setTableColumns] = useState<string[]>([""]);
  const [models, setModels] = useState<string[]>([""]);
  const [tableRows, setTableRows] = useState<JSX.Element[]>([]);

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
          resp = paper.model_responses!.find((v, e) => {
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
                <div className="text-tiny">{paper.abstract}</div>
              </div>
            }
          >
            <span>{paper.document_title}</span>
          </Tooltip>
        );
      }
      return <>{(paper as any)[col]}</>;
    };

    const rows = papers.map((paper, id) => (
      <TableRow key={id}>
        {columns.map((col, col_id) => (
          <TableCell key={"paper" + id + "," + col_id}>
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
    <span>No papers available</span>
  );
}
