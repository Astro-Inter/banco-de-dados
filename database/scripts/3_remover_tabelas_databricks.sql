-- Remove estruturas que passaram a pertencer ao processamento de dados no Databricks.
DROP PROCEDURE IF EXISTS public.atualizar_fato_historico();

DROP TABLE IF EXISTS funcionario_posicao;
DROP TABLE IF EXISTS resumo_funcionario_dia;
DROP TABLE IF EXISTS fato_historico_geral_unidade;
DROP TABLE IF EXISTS calendario;
