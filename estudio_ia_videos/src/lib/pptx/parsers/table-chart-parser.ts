/**
 * PPTX Table and Chart Parser
 * Extracts tables and charts from PPTX slides
 */

import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { logger } from '@/lib/logger';

export interface TableCell {
  text: string;
  rowSpan?: number;
  colSpan?: number;
}

export interface TableRow {
  cells: TableCell[];
}

export interface Table {
  id: string;
  rows: TableRow[];
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface Chart {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'unknown';
  title?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  data?: unknown; // Raw chart data
}

export class PPTXTableChartParser {
  private xmlParser: XMLParser;

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@',
      textNodeName: '#text',
    });
  }

  /**
   * Extract tables from a slide
   */
  async extractTables(zip: JSZip, slideNumber: number): Promise<Table[]> {
    try {
      const slideFile = zip.file(`ppt/slides/slide${slideNumber}.xml`);
      if (!slideFile) {
        return [];
      }

      const slideXml = await slideFile.async('text');
      const slideData = this.xmlParser.parse(slideXml);

      const tables: Table[] = [];
      const shapes = this.getShapes(slideData);

      for (const shape of shapes as any[]) {
        // Look for graphic frame with table
        const graphicFrame = shape['p:graphicFrame'];
        if (!graphicFrame) continue;

        const graphic = graphicFrame['a:graphic'];
        if (!graphic) continue;

        const graphicData = graphic['a:graphicData'];
        if (!graphicData || graphicData['@uri'] !== 'http://schemas.openxmlformats.org/drawingml/2006/table') {
          continue;
        }

        // Extract table
        const tbl = graphicData['a:tbl'];
        if (!tbl) continue;

        const table = this.parseTable(tbl, graphicFrame);
        if (table) {
          tables.push(table);
        }
      }

      logger.info(`Extracted ${tables.length} tables from slide ${slideNumber}`, {
        component: 'PPTXTableChartParser',
      });

      return tables;
    } catch (error) {
      logger.error(
        'Failed to extract tables',
        error instanceof Error ? error : new Error(String(error)),
        { component: 'PPTXTableChartParser', slideNumber }
      );
      return [];
    }
  }

  /**
   * Extract charts from a slide
   */
  async extractCharts(zip: JSZip, slideNumber: number): Promise<Chart[]> {
    try {
      const slideFile = zip.file(`ppt/slides/slide${slideNumber}.xml`);
      if (!slideFile) {
        return [];
      }

      const slideXml = await slideFile.async('text');
      const slideData = this.xmlParser.parse(slideXml);

      const charts: Chart[] = [];
      const shapes = this.getShapes(slideData);

      for (const shape of shapes as any[]) {
        const graphicFrame = shape['p:graphicFrame'];
        if (!graphicFrame) continue;

        const graphic = graphicFrame['a:graphic'];
        if (!graphic) continue;

        const graphicData = graphic['a:graphicData'];
        if (!graphicData || graphicData['@uri'] !== 'http://schemas.openxmlformats.org/drawingml/2006/chart') {
          continue;
        }

        // Extract chart reference
        const chartRef = graphicData['c:chart'];
        if (!chartRef || !chartRef['@r:id']) continue;

        // Get chart relationship
        const relsFile = zip.file(`ppt/slides/_rels/slide${slideNumber}.xml.rels`);
        if (!relsFile) continue;

        const relsXml = await relsFile.async('text');
        const relsData = this.xmlParser.parse(relsXml);

        const relationships = Array.isArray(relsData.Relationships?.Relationship)
          ? relsData.Relationships.Relationship
          : [relsData.Relationships?.Relationship].filter(Boolean);

        const chartRel = relationships.find(
          (rel: { '@Id': string }) => rel['@Id'] === chartRef['@r:id']
        );

        if (!chartRel) continue;

        // Parse chart file
        const chartPath = `ppt/charts/${chartRel['@Target'].split('/').pop()}`;
        const chartFile = zip.file(chartPath);
        
        if (!chartFile) continue;

        const chartXml = await chartFile.async('text');
        const chartData = this.xmlParser.parse(chartXml);

        const chart = this.parseChart(chartData, graphicFrame);
        if (chart) {
          charts.push(chart);
        }
      }

      logger.info(`Extracted ${charts.length} charts from slide ${slideNumber}`, {
        component: 'PPTXTableChartParser',
      });

      return charts;
    } catch (error) {
      logger.error(
        'Failed to extract charts',
        error instanceof Error ? error : new Error(String(error)),
        { component: 'PPTXTableChartParser', slideNumber }
      );
      return [];
    }
  }

  /**
   * Get all shapes from slide data
   */
  private getShapes(slideData: unknown): unknown[] {
    const slide = (slideData as { 'p:sld'?: unknown })['p:sld'];
    if (!slide) return [];

    const cSld = (slide as { 'p:cSld'?: unknown })['p:cSld'];
    if (!cSld) return [];

    const spTree = (cSld as { 'p:spTree'?: unknown })['p:spTree'];
    if (!spTree) return [];

    // Get all shapes (sp, graphicFrame, etc.)
    const shapes: unknown[] = [];
    
    if (Array.isArray((spTree as { 'p:graphicFrame'?: unknown[] })['p:graphicFrame'])) {
      shapes.push(...(spTree as { 'p:graphicFrame': unknown[] })['p:graphicFrame']);
    } else if ((spTree as { 'p:graphicFrame'?: unknown })['p:graphicFrame']) {
      shapes.push((spTree as { 'p:graphicFrame': unknown })['p:graphicFrame']);
    }

    return shapes;
  }

  /**
   * Parse table structure
   */
  private parseTable(tbl: unknown, graphicFrame: unknown): Table | null {
    try {
      const tableGrid = (tbl as { 'a:tblGrid'?: { 'a:gridCol'?: unknown[] | unknown } })['a:tblGrid'];
      const tableRows = (tbl as { 'a:tr'?: unknown[] | unknown })['a:tr'];

      if (!tableRows) return null;

      const rows: TableRow[] = [];
      const rowsArray = Array.isArray(tableRows) ? tableRows : [tableRows];

      for (const row of rowsArray) {
        const cells: TableCell[] = [];
        const tableCells = (row as { 'a:tc'?: unknown[] | unknown })['a:tc'];
        
        if (!tableCells) continue;

        const cellsArray = Array.isArray(tableCells) ? tableCells : [tableCells];

        for (const cell of cellsArray) {
          const text = this.extractCellText(cell);
          const rowSpan = (cell as { '@rowSpan'?: string })['@rowSpan'];
          const colSpan = (cell as { '@gridSpan'?: string })['@gridSpan'];

          cells.push({
            text,
            rowSpan: rowSpan ? parseInt(rowSpan) : undefined,
            colSpan: colSpan ? parseInt(colSpan) : undefined,
          });
        }

        rows.push({ cells });
      }

      // Extract position and size
      const xfrm = (graphicFrame as { 'p:xfrm'?: unknown })['p:xfrm'];
      const position = this.extractPosition(xfrm);
      const size = this.extractSize(xfrm);

      return {
        id: `table_${Date.now()}_${Math.random()}`,
        rows,
        position,
        size,
      };
    } catch (error) {
      logger.error(
        'Failed to parse table',
        error instanceof Error ? error : new Error(String(error)),
        { component: 'PPTXTableChartParser' }
      );
      return null;
    }
  }

  /**
   * Parse chart structure
   */
  private parseChart(chartData: unknown, graphicFrame: unknown): Chart | null {
    try {
      const chartSpace = (chartData as { 'c:chartSpace'?: unknown })['c:chartSpace'];
      if (!chartSpace) return null;

      const chart = (chartSpace as { 'c:chart'?: unknown })['c:chart'];
      if (!chart) return null;

      const plotArea = (chart as { 'c:plotArea'?: unknown })['c:plotArea'];
      if (!plotArea) return null;

      // Determine chart type
      let type: Chart['type'] = 'unknown';
      if ((plotArea as { 'c:barChart'?: unknown })['c:barChart']) type = 'bar';
      else if ((plotArea as { 'c:lineChart'?: unknown })['c:lineChart']) type = 'line';
      else if ((plotArea as { 'c:pieChart'?: unknown })['c:pieChart']) type = 'pie';
      else if ((plotArea as { 'c:areaChart'?: unknown })['c:areaChart']) type = 'area';
      else if ((plotArea as { 'c:scatterChart'?: unknown })['c:scatterChart']) type = 'scatter';

      // Extract title
      const title = (chart as { 'c:title'?: { 'c:tx'?: { 'c:rich'?: { 'a:p'?: { 'a:r'?: { 'a:t'?: string } } } } } })['c:title']?.['c:tx']?.['c:rich']?.['a:p']?.['a:r']?.['a:t'];

      // Extract position and size
      const xfrm = (graphicFrame as { 'p:xfrm'?: unknown })['p:xfrm'];
      const position = this.extractPosition(xfrm);
      const size = this.extractSize(xfrm);

      return {
        id: `chart_${Date.now()}_${Math.random()}`,
        type,
        title,
        position,
        size,
        data: plotArea, // Store raw plot area data
      };
    } catch (error) {
      logger.error(
        'Failed to parse chart',
        error instanceof Error ? error : new Error(String(error)),
        { component: 'PPTXTableChartParser' }
      );
      return null;
    }
  }

  /**
   * Extract text from table cell
   */
  private extractCellText(cell: unknown): string {
    try {
      const txBody = (cell as { 'a:txBody'?: unknown })['a:txBody'];
      if (!txBody) return '';

      const paragraphs = (txBody as { 'a:p'?: unknown[] | unknown })['a:p'];
      if (!paragraphs) return '';

      const paraArray = Array.isArray(paragraphs) ? paragraphs : [paragraphs];
      const texts: string[] = [];

      for (const para of paraArray) {
        const runs = (para as { 'a:r'?: unknown[] | unknown })['a:r'];
        if (!runs) continue;

        const runsArray = Array.isArray(runs) ? runs : [runs];
        
        for (const run of runsArray) {
          const text = (run as { 'a:t'?: string })['a:t'];
          if (text) texts.push(text);
        }
      }

      return texts.join(' ');
    } catch {
      return '';
    }
  }

  /**
   * Extract position from transform
   */
  private extractPosition(xfrm: unknown): { x: number; y: number } {
    try {
      const off = (xfrm as { 'a:off'?: { '@x'?: string; '@y'?: string } })['a:off'];
      return {
        x: off?.['@x'] ? parseInt(off['@x']) : 0,
        y: off?.['@y'] ? parseInt(off['@y']) : 0,
      };
    } catch {
      return { x: 0, y: 0 };
    }
  }

  /**
   * Extract size from transform
   */
  private extractSize(xfrm: unknown): { width: number; height: number } {
    try {
      const ext = (xfrm as { 'a:ext'?: { '@cx'?: string; '@cy'?: string } })['a:ext'];
      return {
        width: ext?.['@cx'] ? parseInt(ext['@cx']) : 0,
        height: ext?.['@cy'] ? parseInt(ext['@cy']) : 0,
      };
    } catch {
      return { width: 0, height: 0 };
    }
  }
}
